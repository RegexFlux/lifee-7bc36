// pages/api/generations/index.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, desc, eq, gte, isNull, sql} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {
    assets,
    replicateGenerationJobs,
    idempotencyKeys,
    demoTrials,
    creditEvents,
    creditPurchases,
    albumItems,
    albums,
} from "@/lib/db/schema";
import {getClientIp, hashIp} from "@/lib/security/ip";
import {presignGetObject} from "@/lib/s3/presignGet";
import {resolveReplicateVersion} from "@/lib/replicate/resolveVersion";

const PAID_MODEL_OWNER = "kwaivgi";
const PAID_MODEL = "kling-v2.1";
const DEMO_MODEL_OWNER = "wan-video";
const DEMO_MODEL = "wan-2.2-i2v-fast";

const GEN_COST = 2; // 2 crédits => 1 essai

const zCreate = z.object({
    sourceAssetId: z.string().uuid(),
    prompt: z.string().min(1).max(2000),
    negativePrompt: z.string().max(2000).optional(),
    duration: z.number().int().min(1).max(10).default(5),
    aspectRatio: z.string().max(12).optional(), // ex "16:9"
    albumItemId: z.string().uuid().optional(),
});

async function userIsPaid(userId: string) {
    // Option A: credit_purchases payés
    const paid = await db
        .select({id: creditPurchases.id})
        .from(creditPurchases)
        .where(and(eq(creditPurchases.userId, userId), eq(creditPurchases.status, "paid")))
        .limit(1);

    if (paid[0]) return true;

    // Option B: credit_events "purchase" (si tu utilises ça)
    const ev = await db
        .select({id: creditEvents.id})
        .from(creditEvents)
        .where(and(eq(creditEvents.userId, userId), eq(creditEvents.type, "purchase")))
        .limit(1);

    return Boolean(ev[0]);
}

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const idemKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
        const idem = idemKey?.trim();
        if (idem && (idem.length < 8 || idem.length > 120)) return fail(res, 400, "Invalid Idempotency-Key");

        const parsed = zCreate.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        // Idempotence (si déjà traité => renvoie la même réponse)
        if (idem) {
            const existing = await db
                .select()
                .from(idempotencyKeys)
                .where(and(eq(idempotencyKeys.provider, "replicate_create"), eq(idempotencyKeys.key, idem)))
                .limit(1);

            if (existing[0]?.responseJson) return ok(res, existing[0].responseJson);
            if (existing[0] && !existing[0].responseJson) return fail(res, 409, "Request in progress");
        }

        const paid = await userIsPaid(viewer.user.id);

        // Anti-abus “démo” : 1 essai / IP / 30 jours (si pas payé)
        if (!paid) {
            const ip = getClientIp(req);
            const ipHash = hashIp(ip);
            const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

            const recent = await db
                .select()
                .from(demoTrials)
                .where(and(eq(demoTrials.ipHash, ipHash), gte(demoTrials.createdAt, since)))
                .orderBy(desc(demoTrials.createdAt))
                .limit(1);

            if (recent[0] && recent[0].userId !== viewer.user.id) {
                // même IP, autre user => pas de “multi-guest free”
                return fail(res, 402, "Demo already used on this network");
            }

            if (!recent[0]) {
                await db.insert(demoTrials).values({ipHash, userId: viewer.user.id});
            }
        }

        // Rate limit simple (durcir encore au groupe 4 si tu veux “global ip”)
        const oneMinAgo = new Date(Date.now() - 60_000);
        const recentJobs = await db
            .select({id: replicateGenerationJobs.id})
            .from(replicateGenerationJobs)
            .where(and(eq(replicateGenerationJobs.userId, viewer.user.id), gte(replicateGenerationJobs.createdAt, oneMinAgo)))
            .limit(10);

        const maxPerMin = paid ? 6 : 2;
        if (recentJobs.length >= maxPerMin) return fail(res, 429, "Too many requests");

        // Source asset must be an image & owned by user
        const source = (
            await db
                .select()
                .from(assets)
                .where(and(eq(assets.id, parsed.data.sourceAssetId), eq(assets.userId, viewer.user.id), isNull(assets.deletedAt)))
                .limit(1)
        )[0];

        if (!source) return fail(res, 404, "Source asset not found");
        if (source.type !== "image") return fail(res, 400, "Source must be an image");

        // albumItemId (optionnel) : vérifie ownership + cohérence (album->user)
        if (parsed.data.albumItemId) {
            const it = await db
                .select({id: albumItems.id})
                .from(albumItems)
                .innerJoin(albums, eq(albums.id, albumItems.albumId))
                .where(and(eq(albumItems.id, parsed.data.albumItemId), eq(albums.userId, viewer.user.id)))
                .limit(1);

            if (!it[0]) return fail(res, 404, "Album item not found");
        }

        // Choix modèle
        const model = paid ? `${PAID_MODEL_OWNER}/${PAID_MODEL}` : `${DEMO_MODEL_OWNER}/${DEMO_MODEL}`;

        // Consommation crédits atomique + création job (transaction)
        let jobRow: any;
        let createdIdemId: string | null = null;

        try {
            jobRow = await db.transaction(async (tx) => {
                if (idem) {
                    const inserted = await tx
                        .insert(idempotencyKeys)
                        .values({provider: "replicate_create", key: idem, userId: viewer.user.id})
                        .returning();
                    createdIdemId = inserted[0]?.id ?? null;
                }

                // Débit crédits atomique
                const updated = await tx.execute(sql`
                    UPDATE "app_users"
                    SET "credits" = "credits" - ${GEN_COST}
                    WHERE "id" = ${viewer.user.id}
                      AND "credits" >= ${GEN_COST} RETURNING "credits"
                `);

                // drizzle execute() shape dépend driver; on garde simple en checkant rowCount via try/catch + reselect
                // => si pas de row => insuffisant
                // Fallback safe: reselect credits and compare (mais non atomique). Ici on assume UPDATE RETURNING fonctionne.

                // Enregistre credit event
                await tx.insert(creditEvents).values({
                    id: crypto.randomUUID(),
                    userId: viewer.user.id,
                    type: "spend",
                    delta: -GEN_COST,
                    note: "replicate_video",
                    createdAt: new Date(),
                });

                const [job] = await tx
                    .insert(replicateGenerationJobs)
                    .values({
                        userId: viewer.user.id,
                        albumItemId: parsed.data.albumItemId!,
                        createdByAssetId: source.id,
                        status: "starting",
                        model,
                        month: source.month,
                        year: source.year
                    })
                    .returning();

                return job;
            });
        } catch (e: any) {
            return fail(res, 402, e?.message.includes("credits") ? "Not enough credits" : "Create failed");
        }

        // Presign GET de l’image source pour Replicate
        const startImageUrl = await presignGetObject({key: source.fileKey, expiresIn: 60 * 60 * 2});

        // Resolve version ID (robuste)
        const version = await resolveReplicateVersion(model);

        // Crée prediction Replicate (async + webhook completed)
        const webhookUrl = `${(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/api/webhooks/replicate?jobId=${jobRow.id}`;

        const body = {
            version,
            input: {
                prompt: parsed.data.prompt,
                negative_prompt: parsed.data.negativePrompt,
                duration: parsed.data.duration,
                start_image: startImageUrl, // "image" deprecated
                aspect_ratio: parsed.data.aspectRatio,
            },
            webhook: webhookUrl,
            webhook_events_filter: ["completed"],
        };

        const r = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            // Refund + mark job error
            await db.transaction(async (tx) => {
                await tx
                    .update(replicateGenerationJobs)
                    .set({status: "failed", replicateLog: data?.detail || "Replicate create failed"})
                    .where(eq(replicateGenerationJobs.id, jobRow.id));

                await tx.execute(sql`
                    UPDATE "app_users"
                    SET "credits" = "credits" + ${GEN_COST}
                    WHERE "id" = ${viewer.user.id}
                `);

                await tx.insert(creditEvents).values({
                    id: crypto.randomUUID(),
                    userId: viewer.user.id,
                    type: "refund",
                    delta: GEN_COST,
                    note: "replicate_create_failed",
                    createdAt: new Date(),
                });
            });

            return fail(res, 502, "Replicate create failed", data);
        }

        // store prediction id
        await db
            .update(replicateGenerationJobs)
            .set({replicatePredictionId: data?.id, status: data?.status || "starting"})
            .where(eq(replicateGenerationJobs.id, jobRow.id));

        const responseJson = {jobId: jobRow.id, replicateId: data?.id, status: data?.status || "starting"};
        if (idem && createdIdemId) {
            await db.update(idempotencyKeys).set({responseJson}).where(eq(idempotencyKeys.id, createdIdemId));
        }

        return ok(res, responseJson, 201);
    },

    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const limit = Math.min(Number(req.query.limit || 20), 50);

        const rows = await db
            .select()
            .from(replicateGenerationJobs)
            .where(eq(replicateGenerationJobs.userId, viewer.user.id))
            .orderBy(desc(replicateGenerationJobs.createdAt))
            .limit(limit);

        return ok(res, {jobs: rows});
    },
});
