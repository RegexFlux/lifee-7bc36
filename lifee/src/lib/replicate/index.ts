// src/lib/replicate/index.ts
import Replicate from "replicate";

export const replicate = new Replicate({auth: process.env.REPLICATE_API_TOKEN});

const PAID_MODEL_OWNER = "kwaivgi";
const PAID_MODEL = "kling-v2.1";

const DEMO_MODEL_OWNER = "wan-video";
const DEMO_MODEL = "wan-2.2-i2v-fast";

// ✅ cache par modèle
const versionCache = new Map<string, { id: string; at: number }>();

async function getLatestVersionId(owner: string, modelName: string) {
    const key = `${owner}/${modelName}`;
    const hit = versionCache.get(key);
    if (hit && Date.now() - hit.at < 1000 * 60 * 30) return hit.id;

    const model = await replicate.models.get(owner, modelName);
    const id = model.latest_version?.id;
    if (!id) throw new Error(`Unable to resolve latest_version.id for ${key}`);

    versionCache.set(key, {id, at: Date.now()});
    return id;
}

// ✅ retourne directement le version id à mettre dans payload.version
export async function getDemoVersionId() {
    return getLatestVersionId(DEMO_MODEL_OWNER, DEMO_MODEL);
}

export async function getKlingVersionId() {
    return getLatestVersionId(PAID_MODEL_OWNER, PAID_MODEL);
}

export function defaultCinematicPrompt() {
    // “best result” = stabilité identité + mouvement doux + ciné réaliste
    return [
        "Bring this photo to life as a cherished, warm memory.",
        "Ultra subtle natural motion: gentle breathing, blinking, micro head movement, slight cloth/hair motion.",
        "Slow steady camera push-in, cinematic realistic lighting, shallow depth of field, smooth motion.",
        "Preserve identity and facial structure, skin tone, hairstyle, outfit, and original composition.",
        "Keep background consistent, no jump cuts, no warping, no morphing, no glitches.",
    ].join(" ");
}

export function defaultNegativePrompt() {
    return [
        "text, subtitles, watermark, logo",
        "low quality, blurry, flicker, jitter, stutter",
        "deformed face, extra fingers, extra limbs",
        "duplicate person, morphing, identity change",
        "camera shake, fast zoom, jump cut",
        "weird artifacts, broken anatomy, unstable background",
    ].join(", ");
}

function cleanContext(desc?: string | null) {
    const s = (desc ?? "").trim().replace(/\s+/g, " ");
    if (!s) return null;
    // limite pour éviter que le modèle parte trop loin
    return s.slice(0, 280);
}

export function buildBestPrompt(params: { description?: string | null; userPrompt?: string | null }) {
    const ctx = cleanContext(params.description);
    const user = (params.userPrompt ?? "").trim();

    // ordre : user prompt (si fourni) -> contexte -> default
    // garde-fou : contexte “influence mood” mais ne change pas la scène/personnes
    const parts = [
        defaultCinematicPrompt(),
        ctx
            ? `Context (use only to guide mood/setting, do not change people/composition): ${ctx}`
            : null,
        user ? `Additional direction: ${user}` : null,
    ].filter(Boolean);

    return parts.join(" ");
}

// ✅ inputs : correction negative_prompt + clés start_image/image
export function getKlingInput(args: {
    prompt: string;
    startImageUrl: string;
    duration?: number;
    aspectRatio?: string;
    negativePrompt?: string;
    mode?: "standard" | "pro";
}) {
    return {
        prompt: args.prompt,
        start_image: args.startImageUrl,
        duration: args.duration ?? 5,
        aspect_ratio: args.aspectRatio ?? "9:16",
        negative_prompt: args.negativePrompt ?? defaultNegativePrompt(),
        mode: args.mode ?? "standard",
    };
}

export function getWanInput(args: {
    prompt: string;
    startImageUrl: string;
    duration?: number;
    aspectRatio?: string;
    negativePrompt?: string;
}) {
    return {
        go_fast: true,
        resolution: "720p",
        num_frames: 81,
        frames_per_second: 16,
        prompt: args.prompt,
        image: args.startImageUrl,
        duration: args.duration ?? 5,
        aspect_ratio: args.aspectRatio ?? "9:16",
        negative_prompt: args.negativePrompt ?? defaultNegativePrompt(),
    };
}
