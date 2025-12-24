import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { lifeeJobs, lifeeJobEvents } from "@/lib/db/schema";
import { presignGet } from "@/lib/s3";
import { asc, eq } from "drizzle-orm";
import {advanceMockJobIfNeeded} from "@/lib/mob/lifecycle";

function appUrl(req: NextApiRequest) {
    const u = process.env.APP_URL;
    if (u) return u.replace(/\/$/, "");
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const jobId = String(req.query.jobId || "");
    const job = await advanceMockJobIfNeeded({ jobId, req });
    if (!job) return res.status(404).json({ error: "Not found" });

    if (!job) return res.status(404).json({ error: "Not found" });

    const events = await db
        .select()
        .from(lifeeJobEvents)
        .where(eq(lifeeJobEvents.jobId, jobId))
        .orderBy(asc(lifeeJobEvents.createdAt))
        .limit(50);

    // Vidéo: S3 si dispo, sinon replicateOutputUrl (affichage immédiat)
    let videoUrl: string | null = null;
    let videoSource: "s3" | "replicate" | null = null;

    if (job.videoKey) {
        videoUrl = await presignGet(job.videoKey);
        videoSource = "s3";
    } else if (job.replicateOutputUrl) {
        videoUrl = job.replicateOutputUrl;
        videoSource = "replicate";
    }

    if (job.status === 'processing') {
        const videoKey = `lifee/videos/${jobId}.mp4`;
        // TODO CHECK IF VIDEO EXISTS ON S3 and FETCH REPLICATE TO CHECK IF STATUS MATCH (job.replicatePredictionId)
        // IF ITS SUCCEEDED ON REPLICATE THEN => FEtCH FROM replicate output url and save in s3 at videoKey
        if (videoUrl) {
            await db.update(lifeeJobs).set({
                videoKey,
                status: 'succeeded',
                progress: 1,
                updatedAt: new Date(),
            }).where(eq(lifeeJobs.id, jobId));
        }
        console.log('vv', videoUrl);
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
        events: events.map((e) => ({ at: e.createdAt, type: e.type, message: e.message })),
    });
}
