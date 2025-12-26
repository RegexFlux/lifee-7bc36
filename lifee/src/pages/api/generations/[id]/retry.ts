// pages/api/generations/[id]/retry.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, isNull, sql} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {
    assets,
    creditEvents,
    idempotencyKeys,
    replicateGenerationJobs,
} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";
import {resolveReplicateVersion} from "@/lib/replicate/resolveVersion";
import {logReplicateJobEvent} from "@/lib/replicate/jobEvents";
import type {ReplicateJobStatus} from "@/lib/db/types";

const GEN_COST = 2;

function getIdemKey(req: NextApiRequest) {
    const raw = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
    const key = raw?.trim();
    if (!key) return null;
    if (key.length < 8 || key.length > 120) return null;
    return key;
}

const TERMINAL_RETRYABLE: readonly ReplicateJobStatus[] = ["failed", "canceled"];

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!id) return fail(res, 400, "Missing id");

        const idemKey = getIdemKey(req);
        if (!idemKey) return fail(res, 400, "Missing or invalid Idempotency-Key");

        // idempotence read (scopé par jobId pour éviter collisions)
        const idemProvider = `replicate_retry:${id}`;
        const existing = await db
            .select()
            .from(idempotencyKeys)
            .where(and(eq(idempotencyKeys.provider, idemProvider), eq(idempotencyKeys.key, idemKey)))
            .limit(1);

        if (existing[0]?.responseJson) return ok(res, existing[0].responseJson);
        if (existing[0] && !existing[0].responseJson) return fail(res, 409, "Request in progress");

        const job = (
            await db
                .select()
                .from(replicateGenerationJobs)
                .where(and(eq(replicateGenerationJobs.id, id), eq(replicateGenerationJobs.userId, viewer.user.id)))
                .limit(1)
        )[0];

        if (!job) return fail(res, 404, "Not found");
        if (!TERMINAL_RETRYABLE.includes(job.status)) return fail(res, 409, "Job is not retryable");

        const source = (
            await db
                .select()
                .from(assets)
                .where(
                    and(
                        eq(assets.id, job.createdByAssetId),
                        eq(assets.userId, viewer.user.id),
                        isNull(assets.deletedAt)
                    )
                )
                .limit(1)
        )[0];

        if (!source) return fail(res, 404, "Source asset not found");
        if (source.type !== "image") return fail(res, 400, "Source must be an image");

        // Replicate model/version
        const model = job.model; // stocké dans job
        const version = await resolveReplicateVersion(model);

        // S3 signed start image
        const startImageUrl = await presignGetObject({key: source.fileKey, expiresIn: 60 * 60 * 2});

        const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
        const webhookUrl = `${appUrl}/api/webhooks/replicate?jobId=${job.id}`;

        // 1) transaction: idempotency + debit credits + create event + reset job state
        try {
            await db.transaction(async (tx) => {
                await tx.insert(idempotencyKeys).values({
                    provider: idemProvider,
                    key: idemKey,
                    userId: viewer.user.id,
                });

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
                    metadata: {reason: "replicate_retry", jobId: job.id, model},
                });

                await tx.update(replicateGenerationJobs).set({
                    status: "queued",
                    replicatePredictionId: null,
                    resultAssetId: null,
                    updatedAt: new Date(),
                }).where(eq(replicateGenerationJobs.id, job.id));

                await logReplicateJobEvent(tx, {
                    jobId: job.id,
                    status: "info",
                    source: "server",
                    message: "Retry requested (credits spent, job reset to queued)",
                });
            });
        } catch (e: any) {
            const status = typeof e?.status === "number" ? e.status : 500;
            return fail(res, status, e?.message || "Retry failed");
        }

        // 2) Create prediction
        const body = {
            version,
            input: {
                prompt: (req.body?.prompt as string | undefined) ?? undefined, // optionnel: si tu veux override prompt
                negative_prompt: (req.body?.negativePrompt as string | undefined) ?? undefined,
                duration: (req.body?.duration as number | undefined) ?? undefined,
                start_image: startImageUrl,
                aspect_ratio: (req.body?.aspectRatio as string | undefined) ?? undefined,
            },
            webhook: webhookUrl,
            webhook_events_filter: ["completed"],
        };

        // nettoyage input undefined (simple)
        Object.keys(body.input).forEach((k) => {
            // @ts-ignore
            if (body.input[k] === undefined) delete body.input[k];
        });

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
            // note: on ne refund pas automatiquement ici (coût retry réel), mais on log l’erreur
            await db.transaction(async (tx) => {
                await tx.update(replicateGenerationJobs).set({
                    status: "failed",
                    updatedAt: new Date(),
                }).where(eq(replicateGenerationJobs.id, job.id));

                await logReplicateJobEvent(tx, {
                    jobId: job.id,
                    status: "error",
                    source: "replicate",
                    message: `Retry create failed: ${data?.detail || "unknown"}`,
                });

                await tx.update(idempotencyKeys).set({
                    responseJson: {jobId: job.id, status: "failed"},
                }).where(and(eq(idempotencyKeys.provider, idemProvider), eq(idempotencyKeys.key, idemKey)));
            });

            return fail(res, 502, "Replicate retry failed", data);
        }

        const predictionId = data?.id as string | undefined;
        const status = (data?.status as string | undefined) || "starting";

        const responseJson = {jobId: job.id, replicateId: predictionId ?? null, status};

        await db.transaction(async (tx) => {
            await tx.update(replicateGenerationJobs).set({
                replicatePredictionId: predictionId ?? null,
                status: status === "processing" ? "processing" : "starting",
                updatedAt: new Date(),
            }).where(eq(replicateGenerationJobs.id, job.id));

            await logReplicateJobEvent(tx, {
                jobId: job.id,
                status: "info",
                source: "replicate",
                message: `Retry prediction created (${predictionId ?? "no-id"}) status=${status}`,
            });

            await tx.update(idempotencyKeys).set({responseJson}).where(
                and(eq(idempotencyKeys.provider, idemProvider), eq(idempotencyKeys.key, idemKey))
            );
        });

        return ok(res, responseJson, 201);
    },
});
