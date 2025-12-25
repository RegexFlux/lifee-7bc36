// pages/api/webhooks/replicate.ts
import type {NextApiRequest, NextApiResponse} from "next";
import crypto, {webcrypto} from "node:crypto";
import {validateWebhook} from "replicate";
import {db} from "@/lib/db";
import {lifeeJobs, lifeeJobEvents} from "@/lib/db/schema";
import {eq} from "drizzle-orm";
import {putRemoteUrlToS3} from "@/lib/s3";
import {albumOrderItems, albumOrders} from "@/lib/db/schema.album";
import {exportJobs} from "@/lib/db/schema.studio";

export const config = {
    api: {bodyParser: false},
};

async function readRawBody(req: NextApiRequest) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
}

function extractOutputUrl(output: any): string | null {
    if (!output) return null;
    if (typeof output === "string") return output;
    if (Array.isArray(output)) return output.find((x) => typeof x === "string") ?? null;
    if (typeof output === "object") {
        for (const k of ["video", "url", "output", "mp4"]) {
            if (typeof output[k] === "string") return output[k];
        }
    }
    return null;
}

function clampLogs(logs: any) {
    if (!logs) return null;
    const s = String(logs);
    return s.length > 4000 ? s.slice(-4000) : s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});

    const jobId = String(req.query.jobId || "");
    if (!jobId) return res.status(400).json({error: "Missing jobId"});

    const raw = await readRawBody(req);
    const secret = process.env.REPLICATE_WEBHOOK_SIGNING_SECRET;

    console.log('body + header', req.body, req.headers);

    if (secret) {
        const webhookIsValid = await validateWebhook(
            {
                id: String(req.headers["webhook-id"] || ""),
                timestamp: String(req.headers["webhook-timestamp"] || ""),
                signature: String(req.headers["webhook-signature"] || ""),
                body: raw.toString("utf8"),
                secret,
            },
            webcrypto
        );

        if (!webhookIsValid) return res.status(401).json({error: "Invalid webhook signature"});
    }

    let body: any;
    try {
        body = JSON.parse(raw.toString("utf8"));
    } catch {
        return res.status(400).json({error: "Invalid JSON"});
    }

    const status: string = body.status; // succeeded / failed / canceled / processing / starting...
    const predictionId: string | undefined = body.id;
    const outputUrl = extractOutputUrl(body.output);
    const logs = clampLogs(body.logs);
    const err = body.error ? String(body.error) : null;

    console.log(`status: ${status}`, outputUrl);
    const job = await db.query.lifeeJobs.findFirst({where: eq(lifeeJobs.id, jobId)});
    if (!job) return res.status(404).json({error: "Job not found"});

    const nextProgress =
        status === "starting" ? 0.35 :
            status === "processing" ? 0.7 :
                status === "succeeded" ? 1 :
                    status === "failed" || status === "canceled" ? 1 :
                        job.progress ?? 0.3;

    const nextStatus =
        status === "processing" ? "processing" :
            status === "succeeded" ? "succeeded" :
                status === "failed" || status === "canceled" ? "failed" :
                    "starting";

    await db.update(lifeeJobs).set({
        replicatePredictionId: predictionId ?? job.replicatePredictionId,
        replicateStatus: status ?? job.replicateStatus,
        replicateLogs: logs ?? job.replicateLogs,
        replicateOutputUrl: outputUrl ?? job.replicateOutputUrl,
        status: nextStatus,
        progress: nextProgress,
        progressMessage:
            nextStatus === "succeeded" ? "Vidéo prête ✅" :
                nextStatus === "processing" ? "Rendu en cours…" :
                    nextStatus === "failed" ? "Erreur pendant la génération" :
                        "Démarrage…",
        error: err,
        updatedAt: new Date(),
    }).where(eq(lifeeJobs.id, jobId));

    await db.insert(lifeeJobEvents).values({
        id: crypto.randomUUID(),
        jobId,
        type: "replicate",
        message: `Webhook: ${status}`,
        createdAt: new Date(),
    });


    // IMPORTANT: Replicate peut retenter (donc handler idempotent) :contentReference[oaicite:8]{index=8}
    if (status === "succeeded" && outputUrl) {
        const key = job.videoKey || `lifee/videos/${jobId}.mp4`;
        await db.update(lifeeJobs).set({videoKey: key, updatedAt: new Date()}).where(eq(lifeeJobs.id, jobId));
        try {
            await putRemoteUrlToS3({key, url: outputUrl, contentType: "video/mp4"});
            await db.insert(lifeeJobEvents).values({
                id: crypto.randomUUID(),
                jobId,
                type: "info",
                message: "Vidéo enregistrée sur S3",
                createdAt: new Date(),
            });
        } catch (e: any) {
            await db.insert(lifeeJobEvents).values({
                id: crypto.randomUUID(),
                jobId,
                type: "warn",
                message: `Upload S3 vidéo échoué: ${e?.message || "?"}`,
                createdAt: new Date(),
            });
        }
    }

    // 1) Si ce job appartient à un album, on sync son statut
    const [orderItem] = await db.select().from(albumOrderItems).where(eq(albumOrderItems.jobId, jobId)).limit(1);

    if (orderItem) {
        const mapped =
            status === "succeeded" ? "succeeded" :
                status === "failed" || status === "canceled" ? "failed" :
                    status === "processing" ? "processing" :
                        "starting";

        await db.update(albumOrderItems).set({
            status: mapped,
            updatedAt: new Date(),
            error: err,
        }).where(eq(albumOrderItems.id, orderItem.id));

        // 2) check "all succeeded"
        const all = await db.select({status: albumOrderItems.status, orderId: albumOrderItems.orderId})
            .from(albumOrderItems)
            .where(eq(albumOrderItems.orderId, orderItem.orderId));

        const anyFailed = all.some((x) => x.status === "failed");
        const allDone = all.length > 0 && all.every((x) => x.status === "succeeded");

        if (anyFailed) {
            await db.update(albumOrders).set({
                status: "error",
                error: "Une ou plusieurs vidéos ont échoué.",
                updatedAt: new Date()
            })
                .where(eq(albumOrders.id, orderItem.orderId));
        } else if (allDone) {
            // 3) créer un exportJob (ou lancer ton vrai pipeline)
            const [order] = await db.select().from(albumOrders).where(eq(albumOrders.id, orderItem.orderId)).limit(1);
            if (order && !order.exportJobId) {
                const [job] = await db.insert(exportJobs).values({
                    userId: order.userId,
                    status: "queued",
                    progress: 0,
                    musicTrackId: null,
                }).returning({id: exportJobs.id});

                await db.update(albumOrders).set({exportJobId: job.id, status: "assembling", updatedAt: new Date()})
                    .where(eq(albumOrders.id, order.id));

                // TODO: ici tu lances ton vrai assembleur.
                // Pour l’instant tu peux réutiliser ta simulation export (comme tu fais déjà).
            }
        }
    }

    return res.status(200).json({ok: true});
}
