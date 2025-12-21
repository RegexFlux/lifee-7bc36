import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { validateWebhook } from "replicate";
import { getJson, keys, putBytes, putJson } from "@/lib/s3";

export const runtime = "nodejs";

type JobRecord = {
    id: string;
    status: "queued" | "generating" | "ready" | "failed";
    createdAt: string;
    replicateId?: string;
    error?: string;
    shareUrl?: string;
    videoKey?: string;
};

export async function POST(request: Request) {
    const secret = process.env.REPLICATE_WEBHOOK_SIGNING_SECRET;

    // Le package Replicate fournit validateWebhook + la doc recommande la vérification :contentReference[oaicite:7]{index=7}
    if (secret) {
        const ok = await validateWebhook(request.clone(), secret);
        if (!ok) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    if (!jobId) return NextResponse.json({ error: "Missing jobId param" }, { status: 400 });

    const prediction = await request.json();

    const job = await getJson<JobRecord>(keys.job(jobId));
    if (!job) return NextResponse.json({ error: "Unknown jobId" }, { status: 404 });

    const status = prediction?.status;
    const output = prediction?.output;

    if (status !== "succeeded") {
        job.status = "failed";
        job.error = prediction?.error || `Prediction not succeeded: ${status}`;
        await putJson(keys.job(jobId), job);
        return NextResponse.json({ ok: true });
    }

    // Kling v2.1 renvoie une URL string (mp4) :contentReference[oaicite:8]{index=8}
    const outputUrl = typeof output === "string" ? output : Array.isArray(output) ? output[0] : null;
    if (!outputUrl) {
        job.status = "failed";
        job.error = "Missing output URL";
        await putJson(keys.job(jobId), job);
        return NextResponse.json({ ok: true });
    }

    const res = await fetch(outputUrl);
    if (!res.ok || !res.body) {
        job.status = "failed";
        job.error = `Failed to fetch output: ${res.status}`;
        await putJson(keys.job(jobId), job);
        return NextResponse.json({ ok: true });
    }

    // Stream -> S3 (évite de tout bufferiser)
    const nodeStream = Readable.fromWeb(res.body as import("stream/web").ReadableStream);

    await putBytes({
        key: keys.video(jobId),
        body: nodeStream,
        contentType: "video/mp4",
        cacheControl: "public, max-age=31536000, immutable",
    });

    job.status = "ready";
    job.videoKey = keys.video(jobId);
    await putJson(keys.job(jobId), job);

    return NextResponse.json({ ok: true });
}
