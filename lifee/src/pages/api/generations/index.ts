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
    albums,
    albumItems,
    creditEvents,
    creditPurchases,
    demoTrials,
    idempotencyKeys,
    replicateGenerationJobs,
    creditPacks,
    // ⚠️ adapte si ton champ s'appelle différemment
} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";
import {getClientIp, hashIp} from "@/lib/security/ip";
import {logReplicateJobEvent} from "@/lib/replicate/jobEvents";

import {match} from "ts-pattern";
import {
    buildBestPrompt,
    defaultNegativePrompt,
    getDemoVersionId,
    getKlingVersionId,
    getKlingInput,
    getWanInput,
} from "@/lib/replicate/index";
import {CREDIT_PACK_TIERS} from "@/lib/shared/enums";

const GEN_COST = 2;

const zCreate = z.object({
    sourceAssetId: z.string().uuid(),
    prompt: z.string().min(1).max(2000).optional(),
    negativePrompt: z.string().max(2000).optional(),
    duration: z.number().int().min(5).max(5).default(5),
    aspectRatio: z.string().max(12).optional(),
    albumItemId: z.string().uuid().optional(),
});

function webhookBase() {
    const base = process.env.PUBLIC_APP_URL;
    if (!base) throw new Error("Missing PUBLIC_APP_URL");
    return base.replace(/\/$/, "");
}

// ⚠️ adapte le join si ton schema diffère (creditPurchases.creditPackId, etc.)
async function userIsTier(userId: string): Promise<(typeof CREDIT_PACK_TIERS)[number] | "demo"> {
    const purchases = await db
        .select({id: creditPurchases.id, tier: creditPacks.tier})
        .from(creditPurchases)
        .leftJoin(creditPacks, eq(creditPacks.id, creditPurchases.creditPackId))
        .where(and(eq(creditPurchases.userId, userId), eq(creditPurchases.status, "paid")));

    return purchases.some((p) => p.tier === "creator")
        ? "creator"
        : purchases.some((p) => p.tier === "standard")
            ? "standard"
            : "demo";
}

function coerceIdemKey(req: NextApiRequest) {
    const raw = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
    const key = raw?.trim();
    if (!key) return null;
    if (key.length < 8 || key.length > 120) return null;
    return key;
}

// helper: normalise drizzle execute return
function firstRow<T = any>(r: any): T | null {
    const rows = r?.rows ?? r;
    return rows?.[0] ?? null;
}

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const idemKey = coerceIdemKey(req);
        if ((req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) && !idemKey) {
            return fail(res, 400, "Invalid Idempotency-Key");
        }

        const parsed = zCreate.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        // Idempotence read
        if (idemKey) {
            const hit = await db
                .select()
                .from(idempotencyKeys)
                .where(and(eq(idempotencyKeys.provider, "replicate_create"), eq(idempotencyKeys.key, idemKey)))
                .limit(1);

            if (hit[0]?.responseJson) return ok(res, hit[0].responseJson);
            if (hit[0] && !hit[0].responseJson) return fail(res, 409, "Request in progress");
        }

        const userTier = await userIsTier(viewer.user.id);
        const paid = userTier === "standard" || userTier === "creator";

        // Anti-abus demo IP / 30j
        if (!paid) {
            const ipHash = hashIp(getClientIp(req));
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const recent = await db
                .select()
                .from(demoTrials)
                .where(and(eq(demoTrials.ipHash, ipHash), gte(demoTrials.createdAt, since)))
                .orderBy(desc(demoTrials.createdAt))
                .limit(1);

            if (recent[0] && recent[0].userId !== viewer.user.id) {
                return fail(res, 402, "Demo already used on this network");
            }
            if (!recent[0]) {
                await db.insert(demoTrials).values({ipHash, userId: viewer.user.id});
            }
        }

        // Rate limit simple / minute
        const oneMinAgo = new Date(Date.now() - 60_000);
        const recentJobs = await db
            .select({id: replicateGenerationJobs.id})
            .from(replicateGenerationJobs)
            .where(and(eq(replicateGenerationJobs.userId, viewer.user.id), gte(replicateGenerationJobs.createdAt, oneMinAgo)))
            .limit(20);

        const maxPerMin = paid ? 6 : 2;
        if (recentJobs.length >= maxPerMin) return fail(res, 429, "Too many requests");

        // Source asset
        const source = (
            await db
                .select()
                .from(assets)
                .where(and(eq(assets.id, parsed.data.sourceAssetId), eq(assets.userId, viewer.user.id), isNull(assets.deletedAt)))
                .limit(1)
        )[0];

        if (!source) return fail(res, 404, "Source asset not found");
        if (source.type !== "image") return fail(res, 400, "Source must be an image");

        // albumItem guard (si fourni)
        if (parsed.data.albumItemId) {
            const it = await db
                .select({id: albumItems.id, assetId: albumItems.assetId})
                .from(albumItems)
                .innerJoin(albums, eq(albums.id, albumItems.albumId))
                .where(and(eq(albumItems.id, parsed.data.albumItemId), eq(albums.userId, viewer.user.id)))
                .limit(1);

            if (!it[0]) return fail(res, 404, "Album item not found");
            if (it[0].assetId !== source.id) return fail(res, 409, "Album item no longer points to source asset");
        }

        // start_image signé
        const startImageUrl = await presignGetObject({key: source.fileKey, expiresIn: 60 * 60 * 2});

        // ✅ BEST PROMPT: default + assets.description (optional) + user prompt
        const bestPrompt = buildBestPrompt({
            description: source.description ?? null,
            userPrompt: parsed.data.prompt ?? null,
        });

        const negative = parsed.data.negativePrompt ?? defaultNegativePrompt();
        const duration = parsed.data.duration ?? 5;
        const aspectRatio = parsed.data.aspectRatio ?? "9:16";

        // ✅ Replicate version id + input
        const {versionId, input} = await match(paid)
            .with(false, async () => ({
                versionId: await getDemoVersionId(),
                input: getWanInput({
                    prompt: bestPrompt,
                    startImageUrl,
                    duration,
                    aspectRatio,
                    negativePrompt: negative,
                }),
            }))
            .with(true, async () => ({
                versionId: await getKlingVersionId(),
                input: getKlingInput({
                    prompt: bestPrompt,
                    startImageUrl,
                    duration,
                    aspectRatio,
                    negativePrompt: negative,
                    mode: userTier === "creator" ? "pro" : "standard",
                }),
            }))
            .exhaustive();

        let generationId: string;

        try {
            const created = await db.transaction(async (tx) => {
                if (idemKey) {
                    await tx.insert(idempotencyKeys).values({
                        provider: "replicate_create",
                        key: idemKey,
                        userId: viewer.user.id,
                    });
                }

                // Débit crédits atomique (⚠️ ne pas tester credits par truthy)
                const r = await tx.execute(sql`
                    UPDATE "users"
                    SET "credits" = "credits" - ${GEN_COST}
                    WHERE "id" = ${viewer.user.id}
                      AND "credits" >= ${GEN_COST} RETURNING "credits"
                `);

                const row = firstRow<{ credits: number }>(r);
                if (!row) {
                    const err: any = new Error("Not enough credits");
                    err.status = 402;
                    throw err;
                }

                await tx.insert(creditEvents).values({
                    userId: viewer.user.id,
                    type: "spend",
                    delta: -GEN_COST,
                    metadata: {reason: "replicate_video", versionId},
                });

                const [job] = await tx
                    .insert(replicateGenerationJobs)
                    .values({
                        userId: viewer.user.id,
                        createdByAssetId: source.id,
                        albumItemId: parsed.data.albumItemId ?? null,
                        model: versionId,          // ✅ on stocke la version réellement utilisée
                        status: "queued",
                        year: source.year,
                        month: source.month,
                        prompt: parsed.data.prompt ?? null,
                        negativePrompt: parsed.data.negativePrompt ?? null,
                        duration,
                        aspectRatio,
                    })
                    .returning();

                await logReplicateJobEvent(tx, {
                    generationId: job.id,
                    status: "info",
                    source: "server",
                    message: `Job created (version=${versionId})`,
                });

                return job;
            });

            generationId = created.id;
        } catch (e: any) {
            const status = typeof e?.status === "number" ? e.status : 500;
            return fail(res, status, e?.message || "Create failed");
        }

        // ✅ webhook public stable (pas localtunnel)
        const webhookUrl = `${webhookBase()}/api/webhooks/replicate?generationId=${generationId}`;

        const rr = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, // :contentReference[oaicite:1]{index=1}
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: versionId,
                input,
                webhook: webhookUrl,
                webhook_events_filter: ["completed"],
            }),
        });

        const data = await rr.json().catch(() => ({}));

        if (!rr.ok) {
            await db.transaction(async (tx) => {
                await tx.update(replicateGenerationJobs).set({
                    status: "failed",
                    updatedAt: new Date(),
                }).where(eq(replicateGenerationJobs.id, generationId));

                await logReplicateJobEvent(tx, {
                    generationId,
                    status: "error",
                    source: "replicate",
                    message: `Create failed: ${data?.detail || "unknown"}`,
                });

                // refund
                await tx.execute(sql`
                    UPDATE "users"
                    SET "credits" = "credits" + ${GEN_COST}
                    WHERE "id" = ${viewer.user.id}
                `);

                await tx.insert(creditEvents).values({
                    userId: viewer.user.id,
                    type: "refund",
                    delta: GEN_COST,
                    metadata: {reason: "replicate_create_failed", generationId},
                });

                if (idemKey) {
                    await tx.update(idempotencyKeys).set({
                        responseJson: {generationId, status: "failed"},
                    }).where(and(eq(idempotencyKeys.provider, "replicate_create"), eq(idempotencyKeys.key, idemKey)));
                }
            });

            return fail(res, 502, "Replicate create failed", data);
        }

        const predictionId = data?.id as string | undefined;
        const status = (data?.status as string | undefined) || "starting";

        await db.transaction(async (tx) => {
            await tx.update(replicateGenerationJobs).set({
                replicatePredictionId: predictionId ?? null,
                status: status === "processing" ? "processing" : "starting",
                updatedAt: new Date(),
            }).where(eq(replicateGenerationJobs.id, generationId));

            await logReplicateJobEvent(tx, {
                generationId,
                status: "info",
                source: "replicate",
                message: `Prediction created (${predictionId ?? "no-id"}) status=${status}`,
            });

            if (idemKey) {
                await tx.update(idempotencyKeys).set({
                    responseJson: {generationId, status},
                }).where(and(eq(idempotencyKeys.provider, "replicate_create"), eq(idempotencyKeys.key, idemKey)));
            }
        });

        return ok(res, {generationId, status}, 201);
    },
});
