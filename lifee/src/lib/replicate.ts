import Replicate from "replicate";

export const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const PAID_MODEL_OWNER = "kwaivgi";
const PAID_MODEL = "kling-v2.1";


const DEMO_MODEL_OWNER = "wavespeedai";
const DEMO_MODEL = "wan-2.1-i2v-480p";


let cachedVersion: { id: string; at: number } | null = null;

export async function getDemoModel() {
    if (cachedVersion && Date.now() - cachedVersion.at < 1000 * 60 * 30) return cachedVersion.id;

    const model = await replicate.models.get(DEMO_MODEL_OWNER, DEMO_MODEL);
    const id = model.latest_version?.id;
    if (!id) throw new Error("Unable to resolve latest_version.id for Kling model");

    cachedVersion = { id, at: Date.now() };
    return id;
}

export async function getKlingModel() {
    if (cachedVersion && Date.now() - cachedVersion.at < 1000 * 60 * 30) return cachedVersion.id;

    const model = await replicate.models.get(PAID_MODEL_OWNER, PAID_MODEL);
    const id = model.latest_version?.id;
    if (!id) throw new Error("Unable to resolve latest_version.id for Kling model");

    cachedVersion = { id, at: Date.now() };
    return id;
}

export function defaultLifeeDemoPrompt() {
    return [
        "Bring this photo to life as a happy, warm memory.",
        "Subtle natural motion, gentle camera push-in, soft sunlight, joyful mood.",
        "Keep faces and identity consistent, preserve composition and colors.",
        "Cinematic, realistic, smooth, no glitches, no warping.",
    ].join(" ");
}

export function getKlingInput(prompt: string | null, startImageUrl: string, duration: number = 1, aspectRatio: string = "16:9", negativePrompt?: string, version: 'standard' | 'pro' = 'standard') {
    return {
        prompt: prompt ?? defaultLifeeDemoPrompt(),
        start_image: startImageUrl,
        duration,
        aspect_ratio: aspectRatio,
        negative_prompt: negativePrompt,
        mode: version,
    };
}


export function getWanInput(prompt: string | null, startImageUrl: string, duration: number = 1, aspectRatio: string = "16:9", negativePrompt?: string) {
    return {
        prompt: prompt ?? defaultLifeeDemoPrompt(),
        image: startImageUrl,
        duration,
        aspect_ratio: aspectRatio,
        negative_prompt: negativePrompt
    };
}

type ReplicatePrediction = {
    id: string;
    status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
    output?: any;
    error?: any;
    logs?: string;
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

export function extractOutputUrl(pred: ReplicatePrediction): string | null {
    const out = pred.output;
    if (!out) return null;

    // selon les modèles, output peut être string | array | object
    if (typeof out === "string") return out;
    if (Array.isArray(out)) {
        const s = out.find((x) => typeof x === "string") as string | undefined;
        return s ?? null;
    }
    if (typeof out === "object") {
        // parfois { video: "..." } ou similaire
        const maybe = Object.values(out).find((v) => typeof v === "string") as string | undefined;
        return maybe ?? null;
    }
    return null;
}
