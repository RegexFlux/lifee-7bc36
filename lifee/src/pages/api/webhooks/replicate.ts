// pages/api/webhooks/replicate.ts
import crypto from "node:crypto";
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {albumItems, assets, replicateGenerationJobs, webhookEvents} from "@/lib/db/schema";
import {putRemoteUrlToS3} from "@/lib/s3/putRemoteUrlToS3";
import {verifyReplicateWebhook} from "@/lib/replicate/webhookVerify";
import {logReplicateJobEvent} from "@/lib/replicate/jobEvents";
import type {ReplicateJobStatus} from "@/lib/db/types";

export const config = {api: {bodyParser: false}};

async function readRawBody(req: NextApiRequest) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString("utf8");
}

function pickOutputUrl(output: any): string | null {
    if (!output) return null;
    if (typeof output === "string") return output;
    if (Array.isArray(output)) return typeof output[0] === "string" ? output[0] : null;
    return null;
}

function coerceStatus(s: any): ReplicateJobStatus | null {
    if (s === "starting") return "starting";
    if (s === "processing") return "processing";
    if (s === "succeeded") return "succeeded";
    if (s === "failed") return "failed";
    if (s === "canceled") return "canceled";
    if (s === "queued") return "queued";
    return null;
}

const TERMINAL: readonly ReplicateJobStatus[] = ["succeeded", "failed", "canceled"];

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const generationId = (req.query.generationId as string | undefined)?.trim();
        if (!generationId) return fail(res, 400, "Missing generationId");

        const rawBody = await readRawBody(req);

        const v = verifyReplicateWebhook({
            rawBody,
            webhookId: req.headers["webhook-id"] as string | undefined,
            webhookTimestamp: req.headers["webhook-timestamp"] as string | undefined,
            webhookSignature: req.headers["webhook-signature"] as string | undefined,
            toleranceSec: 300,
        });
        if (!v.ok) return fail(res, 401, `Invalid webhook: ${v.reason}`);

        const eventId = req.headers["webhook-id"] as string;
        const payload = JSON.parse(rawBody);

        // idempotence
        const exists = await db
            .select({id: webhookEvents.id})
            .from(webhookEvents)
            .where(and(eq(webhookEvents.provider, "replicate"), eq(webhookEvents.eventId, eventId)))
            .limit(1);
        if (exists[0]) return ok(res, {status: "ok"});

        // store event first
        await db.insert(webhookEvents).values({
            id: crypto.randomUUID(),
            provider: "replicate",
            eventId,
            payload,
            relatedReplicateJobId: generationId,
        });

        const job = (await db.select().from(replicateGenerationJobs).where(eq(replicateGenerationJobs.id, generationId)).limit(1))[0];
        if (!job) return ok(res, {status: "ok"});

        if (TERMINAL.includes(job.status)) return ok(res, {status: "ok"});

        const nextStatus = coerceStatus(payload?.status) ?? job.status;
        const predictionId = (payload?.id as string | undefined) ?? job.replicatePredictionId;

        // update job + log status
        await db.transaction(async (tx) => {
            await tx.update(replicateGenerationJobs).set({
                status: nextStatus,
                replicatePredictionId: predictionId ?? null,
                updatedAt: new Date(),
            }).where(eq(replicateGenerationJobs.id, generationId));

            const err = payload?.error ? String(payload.error) : null;
            await logReplicateJobEvent(tx, {
                generationId: generationId,
                status: err ? "warn" : (nextStatus === 'succeeded' ? 'success' : "info"),
                source: "replicate",
                message: err ? `Status=${nextStatus} error=${err}` : `Status=${nextStatus}`,
            });
        });

        if (nextStatus !== "succeeded") return ok(res, {status: "ok"});

        // succeeded => upload output + create asset video + replace album item
        const outUrl = pickOutputUrl(payload?.output);
        if (!outUrl) {
            await db.transaction(async (tx) => {
                await tx.update(replicateGenerationJobs).set({
                    status: "failed",
                    updatedAt: new Date()
                }).where(eq(replicateGenerationJobs.id, generationId));
                await logReplicateJobEvent(tx, {
                    generationId: generationId,
                    status: "error",
                    source: "replicate",
                    message: "Missing output URL"
                });
            });
            return ok(res, {status: "ok"});
        }

        const source = (await db.select().from(assets).where(eq(assets.id, job.createdByAssetId)).limit(1))[0];
        if (!source) {
            await db.transaction(async (tx) => {
                await tx.update(replicateGenerationJobs).set({
                    status: "failed",
                    updatedAt: new Date()
                }).where(eq(replicateGenerationJobs.id, generationId));
                await logReplicateJobEvent(tx, {
                    generationId: generationId,
                    status: "error",
                    source: "server",
                    message: "Missing source asset"
                });
            });
            return ok(res, {status: "ok"});
        }

        const videoKey = `lifee/users/${source.userId}/assets/video/${generationId}.mp4`;
        await putRemoteUrlToS3({key: videoKey, url: outUrl, contentType: "video/mp4"});

        await db.transaction(async (tx) => {
            const [videoAsset] = await tx.insert(assets).values({
                userId: source.userId,
                type: "video",
                fileKey: videoKey,
                title: source.title,
                month: source.month,
                year: source.year,
                generatedFromAssetId: source.id,
            }).returning();

            await tx.update(replicateGenerationJobs).set({
                status: "succeeded",
                resultAssetId: videoAsset.id,
                updatedAt: new Date(),
            }).where(eq(replicateGenerationJobs.id, generationId));

            await logReplicateJobEvent(tx, {
                generationId: generationId,
                status: "success",
                source: "server",
                message: `Video saved to S3 (assetId=${videoAsset.id})`,
            });

            // ✅ remplacement ciblé (uniquement si l’item pointe encore l’image source)
            if (job.albumItemId) {
                const r = await tx
                    .update(albumItems)
                    .set({assetId: videoAsset.id})
                    .where(and(eq(albumItems.id, job.albumItemId), eq(albumItems.assetId, source.id)))
                    .returning({id: albumItems.id});

                if (r.length) {
                    await logReplicateJobEvent(tx, {
                        generationId: generationId,
                        status: "info",
                        source: "server",
                        message: `Album item replaced (albumItemId=${job.albumItemId})`,
                    });
                } else {
                    await logReplicateJobEvent(tx, {
                        generationId: generationId,
                        status: "warn",
                        source: "server",
                        message: `Album item not replaced (item changed meanwhile)`,
                    });
                }
            }
        });

        return ok(res, {status: "ok"});
    },
});
