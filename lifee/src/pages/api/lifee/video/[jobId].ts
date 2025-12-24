import type {NextApiRequest, NextApiResponse} from "next";
import {asc, and, eq} from "drizzle-orm";

import {db} from "@/lib/db";
import {lifeeJobs, lifeeJobEvents} from "@/lib/db/schema";
import {presignGet, s3Exists} from "@/lib/s3";
import {advanceMockJobIfNeeded} from "@/lib/mob/lifecycle";

import {getReplicatePrediction, extractOutputUrl} from "@/lib/replicate";
import {putRemoteUrlToS3} from "@/lib/s3";

function appUrl(req: NextApiRequest) {
    const u = process.env.APP_URL;
    if (u) return u.replace(/\/$/, "");
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return `${proto}://${host}`;
}

async function maybeFinalizeProcessingJob(job: {
    id: string;
    createdAt: Date;
    email: string | null;
    shareSlug: string;
    updatedAt: Date;
    status: string;
    progress: number | null;
    progressMessage: string | null;
    prompt: string | null;
    replicatePredictionId: string | null;
    replicateStatus: string | null;
    replicateLogs: string | null;
    replicateOutputUrl: string | null;
    imageKey: string | null;
    videoKey: string | null;
    error: string | null;
}, jobId: string) {
    if (job.status === "processing") return job;

    const videoKey = job.videoKey ?? `lifee/videos/${jobId}.mp4`;

    // 1) Si videoKey existe ET l’objet est bien sur S3 => succeeded
    if (job.videoKey) {
        const exists = await s3Exists(job.videoKey);
        if (exists) {
            await db
                .update(lifeeJobs)
                .set({
                    status: "succeeded",
                    progress: 1,
                    progressMessage: "Vidéo prête",
                    updatedAt: new Date(),
                })
                .where(and(eq(lifeeJobs.id, jobId), eq(lifeeJobs.status, "processing")));

            return {...job, status: "succeeded", progress: 1, progressMessage: "Vidéo prête"};
        }
    } else {
        await db.update(lifeeJobs).set({videoKey, updatedAt: new Date()}).where(eq(lifeeJobs.id, jobId));
    }

    // 2) Sinon, si on a un predictionId => poll Replicate
    if (job.replicatePredictionId) {
        const pred = await getReplicatePrediction(job.replicatePredictionId);

        if (pred.status === "succeeded") {
            const outUrl = extractOutputUrl(pred);
            if (!outUrl) {
                await db.insert(lifeeJobEvents).values({
                    id: crypto.randomUUID(),
                    jobId,
                    type: "warn",
                    message: "Replicate succeeded mais aucun output URL n’a été trouvé.",
                    createdAt: new Date(),
                });
                return job;
            }

            // Upload vers S3 (idempotent : si déjà là, on skip)
            const already = await s3Exists(videoKey).catch(() => false);
            if (!already) {
                await putRemoteUrlToS3({
                    key: videoKey,
                    url: outUrl,
                    contentType: "video/mp4",
                });
            }

            await db
                .update(lifeeJobs)
                .set({
                    videoKey,
                    status: "succeeded",
                    progress: 1,
                    progressMessage: "Vidéo prête",
                    updatedAt: new Date(),
                })
                .where(and(eq(lifeeJobs.id, jobId), eq(lifeeJobs.status, "processing")));

            await db.insert(lifeeJobEvents).values({
                id: crypto.randomUUID(),
                jobId,
                type: "info",
                message: "Vidéo finalisée : Replicate → S3",
                createdAt: new Date(),
            });

            return {...job, videoKey, status: "succeeded", progress: 1, progressMessage: "Vidéo prête"};
        }

        if (pred.status === "failed" || pred.status === "canceled") {
            await db
                .update(lifeeJobs)
                .set({
                    status: "failed",
                    error: typeof pred.error === "string" ? pred.error : JSON.stringify(pred.error ?? "Replicate failed"),
                    progressMessage: "Génération échouée",
                    updatedAt: new Date(),
                })
                .where(and(eq(lifeeJobs.id, jobId), eq(lifeeJobs.status, "processing")));

            await db.insert(lifeeJobEvents).values({
                id: crypto.randomUUID(),
                jobId,
                type: "warn",
                message: `Replicate status: ${pred.status}`,
                createdAt: new Date(),
            });

            return {...job, status: "failed", progressMessage: "Génération échouée"};
        }

        // starting/processing : pas de side effect
        return job;
    }

    return job;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({error: "Method not allowed"});

    const jobId = String(req.query.jobId || "");
    if (!jobId) return res.status(400).json({error: "Missing jobId"});

    // ton mock advancer
    let job = await advanceMockJobIfNeeded({jobId, req});
    if (!job) return res.status(404).json({error: "Not found"});

    // ✅ finalize proprement si processing
    job = await maybeFinalizeProcessingJob(job, jobId);

    const events = await db
        .select()
        .from(lifeeJobEvents)
        .where(eq(lifeeJobEvents.jobId, jobId))
        .orderBy(asc(lifeeJobEvents.createdAt))
        .limit(50);

    // Vidéo: S3 si existe, sinon fallback Replicate si tu veux preview (optionnel)
    let videoUrl: string | null = null;
    let videoSource: "s3" | "replicate" | null = null;

    if (job.videoKey) {
        const exists = await s3Exists(job.videoKey).catch(() => false);
        if (exists) {
            videoUrl = await presignGet(job.videoKey);
            videoSource = "s3";
        }
    }

    let thumbnailUrl: string | null = null;
    if (job.imageKey) {
        thumbnailUrl = await presignGet(job.imageKey);
    }

    return res.status(200).json({
        id: job.id,
        shareUrl: `${appUrl(req)}/v/${job.shareSlug}`,
        status: job.status,
        progress: job.progress,
        message: job.progressMessage,
        error: job.error,
        videoUrl,
        thumbnailUrl,
        videoSource,
        createdAt: job.createdAt,
        events: events.map((e) => ({at: e.createdAt, type: e.type, message: e.message})),
    });
}
