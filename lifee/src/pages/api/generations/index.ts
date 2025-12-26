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
} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";
import {getClientIp, hashIp} from "@/lib/security/ip";
import {resolveReplicateVersion} from "@/lib/replicate/resolveVersion";
import {logReplicateJobEvent} from "@/lib/replicate/jobEvents";

const PAID_MODEL_OWNER = "kwaivgi";
const PAID_MODEL = "kling-v2.1";
const DEMO_MODEL_OWNER = "wan-video";
const DEMO_MODEL = "wan-2.2-i2v-fast";
const GEN_COST = 2;

const zCreate = z.object({
    sourceAssetId: z.string().uuid(),
    prompt: z.string().min(1).max(2000).optional(),
    negativePrompt: z.string().max(2000).optional(),
    duration: z.number().int().min(5).max(5).default(5),
    aspectRatio: z.string().max(12).optional(),
    albumItemId: z.string().uuid().optional(),
});

async function userIsPaid(userId: string) {
    const paid = await db
        .select({id: creditPurchases.id})
        .from(creditPurchases)
        .where(and(eq(creditPurchases.userId, userId), eq(creditPurchases.status, "paid")))
        .limit(1);
    return Boolean(paid[0]);
}

function coerceIdemKey(req: NextApiRequest) {
    const raw = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
    const key = raw?.trim();
    if (!key) return null;
    if (key.length < 8 || key.length > 120) return null;
    return key;
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

        const paid = await userIsPaid(viewer.user.id);

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

        const model = paid ? `${PAID_MODEL_OWNER}/${PAID_MODEL}` : `${DEMO_MODEL_OWNER}/${DEMO_MODEL}`;

        // Resolve version (✅ tu as confirmé que tu utilises version)
        const version = await resolveReplicateVersion(model);

        let jobId: string;

        try {
            const created = await db.transaction(async (tx) => {
                if (idemKey) {
                    await tx.insert(idempotencyKeys).values({
                        provider: "replicate_create",
                        key: idemKey,
                        userId: viewer.user.id,
                    });
                }

                // Débit crédits atomique
                const r = await tx.execute(sql`
                    UPDATE "users"
                    SET "credits" = "credits" - ${GEN_COST}
                    WHERE "id" = ${viewer.user.id}
                      AND "credits" >= ${GEN_COST} RETURNING "credits"
                `);

                // @ts-ignore driver-dependent
                const rows = r?.rows ?? [];
                if (!rows.length) {
                    const err: any = new Error("Not enough credits");
                    err.status = 402;
                    throw err;
                }

                await tx.insert(creditEvents).values({
                    userId: viewer.user.id,
                    type: "spend",
                    delta: -GEN_COST,
                    metadata: {reason: "replicate_video", model},
                });

                const [job] = await tx
                    .insert(replicateGenerationJobs)
                    .values({
                        userId: viewer.user.id,
                        createdByAssetId: source.id,
                        albumItemId: parsed.data.albumItemId!,
                        model,
                        status: "queued",
                        year: source.year,
                        month: source.month,
                    })
                    .returning();

                await logReplicateJobEvent(tx, {
                    jobId: job.id,
                    status: "info",
                    source: "server",
                    message: `Job created (model=${model})`,
                });

                return job;
            });

            jobId = created.id;
        } catch (e: any) {
            const status = typeof e?.status === "number" ? e.status : 500;
            return fail(res, status, e?.message || "Create failed");
        }

        // start_image signé
        const startImageUrl = await presignGetObject({key: source.fileKey, expiresIn: 60 * 60 * 2});

        const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
        const webhookUrl = `${appUrl}/api/webhooks/replicate?jobId=${jobId}`;

        // Replicate create prediction (✅ version)
        const body = {
            version,
            input: {
                prompt: parsed.data.prompt,
                negative_prompt: parsed.data.negativePrompt,
                duration: parsed.data.duration,
                start_image: startImageUrl,
                aspect_ratio: parsed.data.aspectRatio,
            },
            webhook: webhookUrl,
            webhook_events_filter: ["completed"],
        };

        const rr = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await rr.json().catch(() => ({}));

        if (!rr.ok) {
            await db.transaction(async (tx) => {
                await tx.update(replicateGenerationJobs).set({
                    status: "failed",
                    updatedAt: new Date(),
                }).where(eq(replicateGenerationJobs.id, jobId));

                await logReplicateJobEvent(tx, {
                    jobId,
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
                    metadata: {reason: "replicate_create_failed", jobId},
                });

                if (idemKey) {
                    await tx.update(idempotencyKeys).set({
                        responseJson: {jobId, status: "failed"},
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
            }).where(eq(replicateGenerationJobs.id, jobId));

            await logReplicateJobEvent(tx, {
                jobId,
                status: "info",
                source: "replicate",
                message: `Prediction created (${predictionId ?? "no-id"}) status=${status}`,
            });

            if (idemKey) {
                await tx.update(idempotencyKeys).set({
                    responseJson: {jobId, replicateId: predictionId ?? null, status},
                }).where(and(eq(idempotencyKeys.provider, "replicate_create"), eq(idempotencyKeys.key, idemKey)));
            }
        });

        return ok(res, {jobId, replicateId: predictionId ?? null, status}, 201);
    },
});
