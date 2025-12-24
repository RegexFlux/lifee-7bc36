import { db } from "@/lib/db";
import { lifeeJobs, lifeeJobEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import type { NextApiRequest } from "next";
import { mockVideoAbsoluteUrl } from "@/lib/replicate/provider";

const TOTAL_MS = Number(process.env.MOCK_TOTAL_MS || "6000");

function stage(elapsed: number) {
    const t = Math.max(0, elapsed);
    if (t < TOTAL_MS * 0.2) return { status: "starting", progress: 0.3, msg: "Démarrage…" };
    if (t < TOTAL_MS * 0.75) return { status: "processing", progress: 0.7, msg: "Rendu en cours…" };
    return { status: "succeeded", progress: 1.0, msg: "Vidéo prête ✅" };
}

export async function advanceMockJobIfNeeded(params: { jobId: string; req: NextApiRequest }) {
    const job = await db.query.lifeeJobs.findFirst({ where: eq(lifeeJobs.id, params.jobId) });
    if (!job) return null;

    // on considère "mock" si predictionId commence par "mock_"
    const isMock = (job.replicatePredictionId || "").startsWith("mock_");
    if (!isMock) return job;

    if (job.status === "failed" || job.status === "succeeded") return job;

    const createdAt = job.createdAt instanceof Date ? job.createdAt : new Date(job.createdAt as any);
    const elapsed = Date.now() - createdAt.getTime();
    const next = stage(elapsed);

    // si on change d’état, on écrit en DB + event
    if (job.status !== next.status) {
        const outUrl = next.status === "succeeded" ? mockVideoAbsoluteUrl(params.req) : job.replicateOutputUrl;
        const videoKey = job.videoKey;


        await db.update(lifeeJobs).set({
            status: next.status,
            progress: next.progress,
            progressMessage: next.msg,
            replicateStatus: next.status,
            replicateOutputUrl: outUrl,
            updatedAt: new Date(),
            videoKey
        }).where(eq(lifeeJobs.id, params.jobId));

        await db.insert(lifeeJobEvents).values({
            id: crypto.randomUUID(),
            jobId: params.jobId,
            type: "replicate",
            message: `Mock: ${next.status}`,
            createdAt: new Date(),
        });

        return await db.query.lifeeJobs.findFirst({ where: eq(lifeeJobs.id, params.jobId) });
    }

    // sinon juste laisser tel quel
    return job;
}
