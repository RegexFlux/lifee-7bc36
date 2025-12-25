import type {NextApiRequest, NextApiResponse} from "next";
import crypto from "node:crypto";
import {and, asc, eq, sql} from "drizzle-orm";
import {nanoid} from "nanoid";

import {db} from "@/lib/db";
import {requireUserId} from "@/pages/api/studio/_auth";

import {appUsers} from "@/lib/db/schema.auth";
import {studioAssets, timelineClips} from "@/lib/db/schema.studio";
import {lifeeJobs, lifeeJobEvents} from "@/lib/db/schema";
import {
    albumDraftItems,
    albumDrafts,
    albumOrderItems,
    albumOrders,
} from "@/lib/db/schema.album";

import {creditPurchases} from "@/lib/db/schema.billing";

import {presignGet} from "@/lib/s3";
import {createPredictionLive} from "@/lib/replicate/provider";
import {getPackForUser} from "@/lib/album/packs.server";

import {stripe} from "@/lib/stripe"; // ⚠️ ajuste si différent
import {createSession} from "@/pages/api/auth/session";

type Body = { draftId: string; stripeSessionId: string };

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function isGuestEmail(email: string) {
    const e = normalizeEmail(email);
    return e.endsWith(".invalid") || e.includes("@lifee.invalid") || e.startsWith("guest+");
}

async function migrateGuestData(tx: any, fromUserId: string, toUserId: string) {
    // Déplace tout ce que le guest a pu créer avant paiement
    await tx.update(albumDrafts).set({userId: toUserId}).where(eq(albumDrafts.userId, fromUserId));
    await tx.update(albumOrders).set({userId: toUserId}).where(eq(albumOrders.userId, fromUserId));

    await tx.update(studioAssets).set({userId: toUserId}).where(eq(studioAssets.userId, fromUserId));
    await tx.update(timelineClips).set({userId: toUserId}).where(eq(timelineClips.userId, fromUserId));

    await tx.update(creditPurchases).set({userId: toUserId}).where(eq(creditPurchases.userId, fromUserId));

    // Optionnel: transférer crédits si jamais le guest en a
    const [from] = await tx.select({credits: appUsers.credits}).from(appUsers).where(eq(appUsers.id, fromUserId)).limit(1);
    if ((from?.credits ?? 0) > 0) {
        await tx.update(appUsers).set({
            credits: sql`${appUsers.credits}
            +
            ${from.credits}`
        }).where(eq(appUsers.id, toUserId));
        await tx.update(appUsers).set({credits: 0}).where(eq(appUsers.id, fromUserId));
    }
}

async function resolveUserFromStripeEmail(params: {
    actorUserId: string;
    stripeEmail: string;
}) {
    const email = normalizeEmail(params.stripeEmail);

    return db.transaction(async (tx) => {
        const [actor] = await tx.select().from(appUsers).where(eq(appUsers.id, params.actorUserId)).limit(1);
        if (!actor) throw new Error("User not found");

        // Cherche un compte existant par email Stripe
        const [existing] = await tx.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);

        if (!existing) {
            // Pas d'existant → on “convertit” l’acteur en compte email Stripe (si c'était guest)
            if (!actor.email || isGuestEmail(actor.email)) {
                await tx.update(appUsers).set({email}).where(eq(appUsers.id, params.actorUserId));
            }
            return {userId: params.actorUserId, merged: false};
        }

        // Si c'est déjà le même user, rien à faire
        if (existing.id === params.actorUserId) return {userId: existing.id, merged: false};

        // Email existe sur un autre compte → on MERGE le guest vers existing
        await migrateGuestData(tx, params.actorUserId, existing.id);

        // (Optionnel) marque le guest comme “merged”
        // await tx.update(appUsers).set({ email: `merged+${params.actorUserId}@lifee.invalid` }).where(eq(appUsers.id, params.actorUserId));

        return {userId: existing.id, merged: true};
    });
}

async function ensurePurchasePaidAndCredit(params: {
    stripeSessionId: string;
    targetUserId: string;
}) {
    // 1) Vérifie Stripe
    const session = await stripe.checkout.sessions.retrieve(params.stripeSessionId);
    if (session.payment_status !== "paid") {
        throw new Error("Paiement non confirmé");
    }

    const packIdFromMeta = session.metadata?.packId || null;
    const stripeEmail = session.customer_details?.email || session.customer_email || null;

    // 2) Récupère la purchase (si elle a été créée à l’init du checkout)
    let purchase = await db.query.creditPurchases.findFirst({
        where: eq(creditPurchases.stripePaymentIntentId, params.stripeSessionId),
    });

    // 3) Fallback si pas de row (au cas où)
    if (!purchase) {
        if (!packIdFromMeta) throw new Error("Pack introuvable (metadata.packId manquante)");
        const [created] = await db
            .insert(creditPurchases)
            .values({
                id: crypto.randomUUID(),
                userId: params.targetUserId,
                stripeSessionId: params.stripeSessionId,
                packId: packIdFromMeta,
                status: "paid",
                paidAt: new Date(),
                // optionnel: email: stripeEmail
            } as any)
            .returning();
        purchase = created as any;
    }

    // 4) Créditer idempotent
    const pack = getPackForUser(params.targetUserId, purchase!.packId);
    await db.transaction(async (tx) => {
        const [p] = await tx
            .select()
            .from(creditPurchases)
            .where(eq(creditPurchases.stripePaymentIntentId, params.stripeSessionId))
            .limit(1);

        if (!p) throw new Error("Purchase introuvable");

        // rattache toujours l'achat au target user (merge safe)
        if (p.userId !== params.targetUserId) {
            await tx.update(creditPurchases).set({userId: params.targetUserId}).where(eq(creditPurchases.stripePaymentIntentId, params.stripeSessionId));
        }

        if (p.status !== "paid") {
            await tx
                .update(creditPurchases)
                .set({
                    status: "paid",
                    paidAt: new Date(),
                })
                .where(eq(creditPurchases.stripePaymentIntentId, params.stripeSessionId));

            await tx
                .update(appUsers)
                .set({
                    credits: sql`${appUsers.credits}
                    +
                    ${pack.credits}`
                })
                .where(eq(appUsers.id, params.targetUserId));
        }
    });

    return {pack, stripeEmail};
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<{ orderId: string } | { error: string }>
) {
    const actorUserId = await requireUserId(req, res);
    if (!actorUserId) return;

    if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});

    const body = req.body as Body;
    if (!body?.draftId) return res.status(400).json({error: "Missing draftId"});
    if (!body?.stripeSessionId) return res.status(400).json({error: "Missing stripeSessionId"});

    // 1) draft ownership (sur acteur)
    const [draft] = await db
        .select()
        .from(albumDrafts)
        .where(and(eq(albumDrafts.id, body.draftId), eq(albumDrafts.userId, actorUserId)));
    if (!draft) return res.status(404).json({error: "Draft not found"});

    // 2) Email Stripe + merge/resolve user
    let stripeEmail: string | null = null;
    try {
        const session = await stripe.checkout.sessions.retrieve(body.stripeSessionId);
        stripeEmail = session.customer_details?.email || session.customer_email || null;
        if (!stripeEmail) return res.status(400).json({error: "Email manquant côté Stripe"});
    } catch (e: any) {
        return res.status(400).json({error: e?.message || "Stripe session invalid"});
    }

    const resolved = await resolveUserFromStripeEmail({
        actorUserId,
        stripeEmail,
    });
    const targetUserId = resolved.userId;

    // 3) S'assurer que purchase est paid + créditer (idempotent)
    let pack: ReturnType<typeof getPack>;
    try {
        const out = await ensurePurchasePaidAndCredit({
            stripeSessionId: body.stripeSessionId,
            targetUserId,
        });
        pack = out.pack;
    } catch (e: any) {
        return res.status(402).json({error: e?.message || "Paiement non confirmé"});
    }

    // 4) (Idempotence) si un order existe déjà pour ce draft, renvoyer
    const existingOrder = await db.query.albumOrders.findFirst({
        where: and(eq(albumOrders.draftId, body.draftId), eq(albumOrders.userId, targetUserId)),
    });
    if (existingOrder?.id) {
        if (resolved.merged) {
            // swap session sur le vrai compte (zéro friction)
            await createSession(res, targetUserId);
        }
        return res.status(200).json({orderId: existingOrder.id});
    }

    // 5) load draft items (ordered)
    const items = await db
        .select({
            assetId: albumDraftItems.assetId,
            type: studioAssets.type,
            position: albumDraftItems.position,
        })
        .from(albumDraftItems)
        .innerJoin(studioAssets, and(eq(studioAssets.id, albumDraftItems.assetId)))
        .where(eq(albumDraftItems.draftId, body.draftId))
        .orderBy(asc(albumDraftItems.position));


    if (items.length === 0) return res.status(400).json({error: "Draft empty"});

    // 6) Vérifier que toutes les sources existent (et appartiennent au target user après merge)
    const sources = await db
        .select()
        .from(studioAssets)
        .where(eq(studioAssets.userId, targetUserId));

    const byId = new Map(sources.map((s) => [s.id, s]));
    for (const it of items) {
        if (!byId.has(it.assetId)) {
            return res.status(400).json({error: `Asset manquant dans la bibliothèque: ${it.assetId}`});
        }
    }
    const requiredCredits = items.filter(x => x.type === 'image').length; // 1 photo -> 1 vidéo IA (dans ce flow)

    // 7) check credits
    const [user] = await db.select({credits: appUsers.credits}).from(appUsers).where(eq(appUsers.id, targetUserId));
    if ((user?.credits ?? 0) < requiredCredits) {
        return res.status(402).json({error: `Crédits insuffisants (${user?.credits ?? 0}/${requiredCredits})`});
    }

    // 8) create order
    const [order] = await db
        .insert(albumOrders)
        .values({
            userId: targetUserId,
            draftId: body.draftId,
            status: "generating",
            requiredCredits,
            packId: pack?.id ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any)
        .returning({id: albumOrders.id});

    // 9) Batch: jobs + assets + timeline + debit (débit atomique par item)
    for (const it of items) {
        const source = byId.get(it.assetId)!;

        // Débit 1 crédit atomique (évite courses)
        const [debited] = await db
            .update(appUsers)
            .set({
                credits: sql`${appUsers.credits}
                - 1`
            })
            .where(and(eq(appUsers.id, targetUserId), sql`${appUsers.credits}
            > 0`))
            .returning({credits: appUsers.credits});

        if (!debited) {
            // stop net (normalement impossible vu le check global, mais safe)
            await db.update(albumOrders).set({
                status: "error",
                updatedAt: new Date()
            } as any).where(eq(albumOrders.id, order.id));
            return res.status(402).json({error: "Crédits insuffisants pendant la génération"});
        }

        const jobId = crypto.randomUUID();
        const shareSlug = nanoid(10);
        const videoKey = `lifee/videos/${jobId}.mp4`;

        await db.insert(lifeeJobs).values({
            id: jobId,
            shareSlug,
            status: "starting",
            progress: 0.3,
            progressMessage: "Démarrage…",
            videoKey,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await db.insert(lifeeJobEvents).values({
            id: crypto.randomUUID(),
            jobId,
            type: "info",
            message: "Album confirm: job créé",
            createdAt: new Date(),
        });

        const startImageUrl = await presignGet(source.fileKey, 60 * 60);

        const prediction = await createPredictionLive(jobId, {
            startImageUrl,
            prompt: source.context || "Restaure la photo, préserve les couleurs, rendu réaliste et stable.",
            version: pack?.tier === "creator" ? "pro" : "standard",
        });

        await db
            .update(lifeeJobs)
            .set({
                replicatePredictionId: prediction.id,
                replicateStatus: prediction.status,
                updatedAt: new Date(),
            })
            .where(eq(lifeeJobs.id, jobId));

        const [videoAsset] = await db
            .insert(studioAssets)
            .values({
                userId: targetUserId,
                type: "video",
                title: `${source.title} (AI)`,
                month: source.month,
                year: source.year,
                durationSec: 5,
                thumbnailKey: source.thumbnailKey ?? source.fileKey,
                fileKey: videoKey,
                isGenerated: true,
                context: source.context ?? null,
                createdAt: new Date(),
            } as any)
            .returning({id: studioAssets.id});

        await db.insert(albumOrderItems).values({
            orderId: order.id,
            sourceAssetId: source.id,
            videoAssetId: videoAsset.id,
            jobId,
            position: it.position,
            status: "starting",
            updatedAt: new Date(),
        } as any);

        await db.insert(timelineClips).values({
            userId: targetUserId,
            assetId: videoAsset.id,
            position: it.position,
            source: "generated",
            context: source.context ?? null,
            createdAt: new Date(),
        } as any);
    }

    // 10) mark draft paid + order updated
    await db.update(albumDrafts).set({
        status: "paid",
        updatedAt: new Date(),
        userId: targetUserId
    } as any).where(eq(albumDrafts.id, body.draftId));
    await db.update(albumOrders).set({updatedAt: new Date()} as any).where(eq(albumOrders.id, order.id));

    // 11) Si merge, swap cookie session → l’utilisateur est maintenant “connecté” au bon compte
    if (resolved.merged) {
        await createSession(res, targetUserId);
    }

    return res.status(200).json({orderId: order.id});
}
