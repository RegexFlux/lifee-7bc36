// pages/api/webhooks/replicate.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {assets, replicateGenerationJobs, webhookEvents, albumItems} from "@/lib/db/schema";
import {verifyReplicateWebhook} from "@/lib/replicate/webhookVerify";
import {putRemoteUrlToS3} from "@/lib/s3/putRemoteUrlToS3";

export const config = {
    api: {bodyParser: false},
};

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

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const jobId = (req.query.jobId as string | undefined)?.trim();
        if (!jobId) return fail(res, 400, "Missing jobId");

        const rawBody = await readRawBody(req);

        const v = verifyReplicateWebhook({
            rawBody,
            webhookId: req.headers["webhook-id"] as string | undefined,
            webhookTimestamp: req.headers["webhook-timestamp"] as string | undefined,
            webhookSignature: req.headers["webhook-signature"] as string | undefined,
            toleranceSec: 300,
        });

        if (!v.ok) return fail(res, 401, `Invalid webhook: ${v.reason}`);

        const webhookId = req.headers["webhook-id"] as string;
        const exists = await db
            .select({id: webhookEvents.id})
            .from(webhookEvents)
            .where(and(eq(webhookEvents.provider, "replicate"), eq(webhookEvents.eventId, webhookId)))
            .limit(1);

        // Idempotent: déjà traité
        if (exists[0]) return ok(res, {status: "ok"});

        const payload = JSON.parse(rawBody);

        // Store event first (idempotence)
        await db.insert(webhookEvents).values({
            id: crypto.randomUUID(),
            provider: "replicate",
            eventId: webhookId,
            payload,
            createdAt: new Date(),
        });

        // Load job
        const job = (await db.select().from(replicateGenerationJobs).where(eq(replicateGenerationJobs.id, jobId)).limit(1))[0];
        if (!job) return ok(res, {status: "ok"});

        // Ignore late webhooks after terminal state (safety)
        if (job.status === "succeeded" || job.status === "failed" || job.status === "canceled") {
            return ok(res, {status: "ok"});
        }

        const status = payload?.status ?? job.status;
        const replicatePredictionId = payload?.id as string | undefined;

        await db
            .update(replicateGenerationJobs)
            .set({
                status,
                replicatePredictionId: replicatePredictionId || job.replicatePredictionId,
                replicateLog: payload?.error || null,
                updatedAt: new Date(),
            })
            .where(eq(replicateGenerationJobs.id, jobId));

        if (status !== "succeeded") {
            if (status === "failed" || status === "canceled") {
                // (Optionnel) refund si tu veux — mais on a déjà “spend”, à toi de décider politique.
            }
            return ok(res, {status: "ok"});
        }

        // SUCCEEDED: upload output -> S3, create asset video
        const outUrl = pickOutputUrl(payload?.output);
        if (!outUrl) {
            await db.update(replicateGenerationJobs).set({
                status: "failed",
                replicateLog: "Missing output URL"
            }).where(eq(replicateGenerationJobs.id, jobId));
            return ok(res, {status: "ok"});
        }

        // Source asset for month/year + userId
        const source = (await db.select().from(assets).where(eq(assets.id, job.createdByAssetId)).limit(1))[0];
        if (!source) {
            await db.update(replicateGenerationJobs).set({
                status: "failed",
                replicateLog: "Missing source asset"
            }).where(eq(replicateGenerationJobs.id, jobId));
            return ok(res, {status: "ok"});
        }

        const videoKey = `lifee/users/${source.userId}/assets/video/${jobId}.mp4`;
        await putRemoteUrlToS3({key: videoKey, url: outUrl, contentType: "video/mp4"});

        const [videoAsset] = await db
            .insert(assets)
            .values({
                userId: source.userId,
                type: "video",
                fileKey: videoKey,
                title: source.title,
                month: source.month,
                year: source.year,
                generatedFromAssetId: source.id,
            })
            .returning();

        // Update job with result
        await db
            .update(replicateGenerationJobs)
            .set({resultAssetId: videoAsset.id, status: "succeeded", updatedAt: new Date()})
            .where(eq(replicateGenerationJobs.id, jobId));

        // Replace ALBUM ITEM targeted (only if it still points to the source image)
        if (job.albumItemId) {
            await db
                .update(albumItems)
                .set({assetId: videoAsset.id, updatedAt: new Date()})
                .where(and(eq(albumItems.id, job.albumItemId), eq(albumItems.assetId, source.id)));
        }

        return ok(res, {status: "ok"});
    },
});
