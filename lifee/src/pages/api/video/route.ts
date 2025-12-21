import {NextResponse} from "next/server";
import Replicate from "replicate";
import {nanoid} from "nanoid";
import {keys, putBytes, putJson} from "@/lib/s3";

export const runtime = "nodejs";

type JobStatus = "queued" | "generating" | "ready" | "failed";

type JobRecord = {
    id: string;
    status: JobStatus;
    createdAt: string;
    replicateId?: string;
    prompt?: string;
    negativePrompt?: string;
    error?: string;
    videoKey?: string;
    shareUrl?: string;
};

function buildHappyPrompt() {
    const prompt =
        "Animate this photo into a short cinematic happy memory. Keep the same people and scene identity. " +
        "Subtle natural motion (gentle breeze, slight smile, small head movement), smooth camera push-in, " +
        "warm golden hour light, joyful mood, photorealistic, stable frames, no sudden changes.";
    const negative =
        "blurry, low quality, jitter, flicker, glitch, distortion, warped face, extra fingers, text, watermark, logo";
    return {prompt, negative};
}

export async function POST(req: Request) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) return NextResponse.json({error: "Missing NEXT_PUBLIC_SITE_URL"}, {status: 500});

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return NextResponse.json({error: "Missing REPLICATE_API_TOKEN"}, {status: 500});

    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
        return NextResponse.json({error: "No file provided (field: image)"}, {status: 400});
    }

    const id = nanoid(12);
    const {prompt, negative} = buildHappyPrompt();

    const record: JobRecord = {
        id,
        status: "queued",
        createdAt: new Date().toISOString(),
        prompt,
        negativePrompt: negative,
        shareUrl: `${siteUrl}/v/${id}`,
    };

    // (optionnel) stocker l’upload pour debug / re-run
    const ext = file.type === "image/png" ? "png" : "jpg";
    await putBytes({
        key: `${keys.upload(id)}.${ext}`,
        body: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "image/jpeg",
        cacheControl: "private, max-age=0, no-store",
    });

    await putJson(keys.job(id), record);

    const replicate = new Replicate({auth: token});

    const model = process.env.KLING_MODEL ?? "kwaivgi/kling-v2.1";
    const mode = process.env.KLING_MODE ?? "pro";

    // Astuce Replicate : query params pour passer ton ID interne au webhook :contentReference[oaicite:4]{index=4}
    const webhook = `${siteUrl}/api/webhooks/replicate?jobId=${encodeURIComponent(id)}`;

    try {
        const prediction = await replicate.predictions.create({
            model,
            input: {
                prompt,
                negative_prompt: negative,
                start_image: file, // upload auto via SDK :contentReference[oaicite:5]{index=5}
                mode, // "standard" (720p) ou "pro" (1080p) :contentReference[oaicite:6]{index=6}
            },
            webhook,
            webhook_events_filter: ["completed"],
        });

        record.status = "generating";
        record.replicateId = prediction.id;
        await putJson(keys.job(id), record);

        return NextResponse.json({
            id,
            status: record.status,
            shareUrl: record.shareUrl,
            statusEndpoint: `/api/video/${id}`,
        });
    } catch (_) {
        record.status = "failed";
        record.error = "Replicate error";
        await putJson(keys.job(id), record);
        return NextResponse.json({error: record.error}, {status: 500});
    }
}
