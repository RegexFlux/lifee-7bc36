// pages/api/webhooks/replicate.ts
import crypto from "node:crypto";
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, sql} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {albumItems, assets, exportJobItems, exportJobs, replicateGenerationJobs, webhookEvents} from "@/lib/db/schema";
import {putRemoteUrlToS3} from "@/lib/s3/putRemoteUrlToS3";
import {verifyReplicateWebhook} from "@/lib/replicate/webhookVerify";
import {logReplicateJobEvent} from "@/lib/replicate/jobEvents";
import type {ReplicateJobStatus} from "@/lib/db/types";
import {tryReleaseExportsForAlbum} from "@/lib/exports/tryReleaseExportsForAlbum";
import {enqueueExportJob} from "@/lib/aws/enqueueExportJob";

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

        if (job.status === "succeeded" && job.resultAssetId) {
            return ok(res, {status: "ok"});
        }

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

// ✅ On arrive ici: Replicate dit "succeeded"
// On ne marque PAS succeeded en DB tant que pas finalisé.

        const outUrl = pickOutputUrl(payload?.output);
        if (!outUrl) {
            await db.transaction(async (tx) => {
                await tx.update(replicateGenerationJobs).set({
                    status: "failed",
                    updatedAt: new Date(),
                }).where(eq(replicateGenerationJobs.id, generationId));
                await logReplicateJobEvent(tx, {
                    generationId,
                    status: "error",
                    source: "replicate",
                    message: "Missing output URL",
                });
            });
            return ok(res, {status: "ok"});
        }

// re-fetch job (au cas où)
        const fresh = (await db.select().from(replicateGenerationJobs).where(eq(replicateGenerationJobs.id, generationId)).limit(1))[0];
        if (!fresh) return ok(res, {status: "ok"});

// Idempotence : déjà finalisé ?
        if (fresh.status === "succeeded" && fresh.resultAssetId) {
            return ok(res, {status: "ok"});
        }

// Optionnel (recommandé) : si tu ajoutes "finalizing" dans l'enum, tu peux verrouiller ici
// await db.update(replicateGenerationJobs).set({ status: "finalizing" }).where(and(eq(...), inArray(status, ["starting","processing","queued"])))

// Source asset
        const source = (await db.select().from(assets).where(eq(assets.id, fresh.createdByAssetId)).limit(1))[0];
        if (!source) {
            await db.transaction(async (tx) => {
                await tx.update(replicateGenerationJobs).set({
                    status: "failed",
                    updatedAt: new Date()
                }).where(eq(replicateGenerationJobs.id, generationId));
                await logReplicateJobEvent(tx, {
                    generationId,
                    status: "error",
                    source: "server",
                    message: "Missing source asset"
                });
            });
            return ok(res, {status: "ok"});
        }

// Upload vidéo sur S3 (idempotent si key stable)
        const videoKey = `lifee/users/${source.userId}/assets/video/${generationId}.mp4`;
        await putRemoteUrlToS3({key: videoKey, url: outUrl, contentType: "video/mp4"});

        let updatedId: string | null = null;

// Finalisation DB atomique
        await db.transaction(async (tx) => {
            // Re-check: si un autre process a déjà écrit resultAssetId, on stop
            const again = (await tx.select().from(replicateGenerationJobs).where(eq(replicateGenerationJobs.id, generationId)).limit(1))[0];
            if (again?.status === "succeeded" && again.resultAssetId) return;

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

            if (job.exportJobId) {
                // Marque l’item snapshot comme résolu (uniquement si encore sur sourceAssetId)
                await tx.update(exportJobItems)
                    .set({resolvedAssetId: videoAsset.id, updatedAt: new Date()})
                    .where(and(
                        eq(exportJobItems.exportJobId, job.exportJobId),
                        eq(exportJobItems.sourceAssetId, source.id),
                        sql`${exportJobItems.resolvedAssetId}
                        IS NULL`
                    ));

                // Check readiness export
                const [{pending}] = await tx.select({
                    pending: sql<number>`COUNT(*) FILTER (WHERE
                    ${replicateGenerationJobs.status}
                    IN
                    (
                    'queued',
                    'starting',
                    'processing'
                    )
                    )`,
                })
                    .from(replicateGenerationJobs)
                    .where(eq(replicateGenerationJobs.exportJobId, job.exportJobId));

                if (Number(pending) === 0) {
                    // passe export à queued
                    const [updated] = await tx.update(exportJobs)
                        .set({status: "queued", updatedAt: new Date()})
                        .where(and(eq(exportJobs.id, job.exportJobId), eq(exportJobs.status, "waiting_generations")))
                        .returning({id: exportJobs.id});
                    if (updated?.id) {
                        updatedId = updated.id;
                    }

                }
            }

            await logReplicateJobEvent(tx, {
                generationId,
                status: "success",
                source: "server",
                message: `Video saved to S3 (assetId=${videoAsset.id})`,
            });

            // Remplacement item uniquement si encore sur l'image source
            if (again?.albumItemId) {
                const r = await tx.update(albumItems)
                    .set({assetId: videoAsset.id})
                    .where(and(eq(albumItems.id, again.albumItemId), eq(albumItems.assetId, source.id)))
                    .returning({id: albumItems.id});

                await logReplicateJobEvent(tx, {
                    generationId,
                    status: r.length ? "info" : "warn",
                    source: "server",
                    message: r.length
                        ? `Album item replaced (albumItemId=${again.albumItemId})`
                        : `Album item not replaced (item changed meanwhile)`,
                });
            }
        });


        // IMPORTANT: enqueue SQS hors transaction DB (mais tu peux aussi le faire après la transaction)
        if (updatedId) {
            await enqueueExportJob(updatedId)
        }
// Après finalisation : si l'album est ready, release export(s)
        else if (fresh.albumItemId) {
            const item = (await db.select({albumId: albumItems.albumId}).from(albumItems).where(eq(albumItems.id, fresh.albumItemId)).limit(1))[0];
            if (item?.albumId) {
                await tryReleaseExportsForAlbum({albumId: item.albumId});
            }
        }

        return ok(res, {status: "ok"});

    },
});
