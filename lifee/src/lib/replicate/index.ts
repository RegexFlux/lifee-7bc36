// src/lib/replicate/index.ts
import Replicate from "replicate";

export const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const PAID_MODEL_OWNER = "kwaivgi";
const PAID_MODEL = "kling-v2.1";

const DEMO_MODEL_OWNER = "wan-video";
const DEMO_MODEL = "wan-2.2-i2v-fast";


let cachedVersion: { id: string; at: number } | null = null;

export async function getDemoModel() {
    if (cachedVersion && Date.now() - cachedVersion.at < 1000 * 60 * 30) return cachedVersion.id;

    const model = await replicate.models.get(DEMO_MODEL_OWNER, DEMO_MODEL);
    const id = model.latest_version?.id;
    if (!id) throw new Error("Unable to resolve latest_version.id for Kling model");

    cachedVersion = {id, at: Date.now()};
    return id;
}

export async function getKlingModel() {
    if (cachedVersion && Date.now() - cachedVersion.at < 1000 * 60 * 30) return cachedVersion.id;

    const model = await replicate.models.get(PAID_MODEL_OWNER, PAID_MODEL);
    const id = model.latest_version?.id;
    if (!id) throw new Error("Unable to resolve latest_version.id for Kling model");

    cachedVersion = {id, at: Date.now()};
    return id;
}

export function defaultDemoPrompt() {
    return [
        "Bring this photo to life as a happy, warm memory.",
        "Subtle natural motion, gentle camera push-in, soft sunlight, joyful mood.",
        "Keep faces and identity consistent, preserve composition and colors.",
        "Cinematic, realistic, smooth, no glitches, no warping.",
    ].join(" ");
}


function defaultNegativePrompt() {
    // utile même en demo
    return [
        "text, subtitles, watermark, logo",
        "low quality, blurry, flicker, jitter",
        "deformed face, extra fingers, extra limbs",
        "duplicate person, morphing, identity change",
        "camera shake, fast zoom, jump cut",
    ].join(", ");
}

export function getKlingInput(prompt: string | undefined, startImageUrl: string, duration: number = 1, aspectRatio: string = "16:9", negativePrompt?: string, version: 'standard' | 'pro' = 'standard') {
    return {
        prompt: prompt ?? defaultDemoPrompt(),
        start_image: startImageUrl,
        duration,
        aspect_ratio: aspectRatio,
        negative_prompt: negativePrompt ?? defaultNegativePrompt,
        mode: version,
    };
}


export function getWanInput(prompt: string | undefined, startImageUrl: string, duration: number = 1, aspectRatio: string = "16:9", negativePrompt?: string) {
    return {
        go_fast: true,
        resolution: "720p",
        num_frames: 81,
        frames_per_second: 16,
        prompt: prompt ?? defaultDemoPrompt(),
        image: startImageUrl,
        duration,
        aspect_ratio: aspectRatio,
        negative_prompt: negativePrompt ?? defaultNegativePrompt
    };
}

type ReplicatePrediction = {
    id: string;
    status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
    output?: any;
    error?: any;
    logs?: string;
    urls?: {
        cancel: string,
        get: string,
        web: string,
        steam: string,
    }
};

export async function getReplicatePrediction(predictionId: string): Promise<ReplicatePrediction> {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error("Missing REPLICATE_API_TOKEN");

    const r = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`Replicate GET prediction failed: ${r.status} ${txt}`);
    }

    return (await r.json()) as ReplicatePrediction;
}

export function extractOutputUrl(pred: ReplicatePrediction): string | undefined {
    return pred.urls?.get;
}
