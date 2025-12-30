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

export function defaultCinematicPromptStrict() {
    return [
        // Intent
        "Animate this exact photo as a real, authentic memory captured on camera.",
        "Single continuous shot. Do not re-stage the scene. Do not beautify or modernize.",

        // Identity lock
        "Strictly preserve identity: same face shape, proportions, eyes, nose, mouth, hairline, hairstyle, skin tone, age, and expression style.",
        "Preserve clothing details, accessories, and body proportions.",

        // Motion (micro only)
        "Motion must be minimal and natural: subtle breathing, natural blinking (rare), tiny head micro-movements, slight fabric/hair movement from a gentle breeze.",
        "Keep all motion physically plausible and consistent with the original pose.",

        // Camera
        "Camera: very slow, stable push-in (or locked-off if needed). No shake. No fast zoom.",
        "Depth of field consistent with the original photo; avoid exaggerated bokeh.",

        // Look (authentic)
        "Match the original photo’s color, contrast, grain, and imperfections.",
        "Keep the same lighting direction and intensity. No dramatic re-lighting.",
        "Do not upscale/restore faces aggressively; keep natural texture and original sharpness level.",

        // Stability
        "Background must remain perfectly stable: no warping, no bending lines, no drifting objects.",
    ].join(" ");
}

export function defaultCinematicPromptSoft() {
    return [
        "Bring this photo to life as a warm, genuine memory—still realistic and faithful to the original.",
        "Single continuous shot. Keep the original composition and camera viewpoint.",

        "Preserve identity and facial structure exactly: no face redesign, no beautification, no age change.",
        "Preserve skin tone, hairstyle, outfit, and all unique details.",

        "Ultra subtle natural motion only: gentle breathing, occasional blinking, tiny head micro-movements, slight cloth/hair motion.",
        "Very slow, steady camera push-in. Smooth motion. No shake. No jump cuts.",

        "Lighting: match the original photo’s lighting and mood; keep it natural and consistent.",
        "Color and texture: keep the original photo look (grain/softness). Avoid HDR or oversharpening.",
        "Background must stay stable with zero distortions or morphing.",
    ].join(" ");
}

export function defaultNegativePrompt() {
    return [
        // overlays
        "text, subtitles, watermark, logo, timestamps, UI elements",

        // quality / motion issues
        "low quality, blurry, flicker, jitter, stutter, frame wobble, rolling distortions, temporal artifacts",
        "jump cut, fast zoom, camera shake, sudden lighting changes",

        // identity / anatomy
        "identity change, face morphing, face swap, different person, duplicate person",
        "deformed face, asymmetry drift, uncanny face, melted features, wrong teeth, extra fingers, extra limbs, broken anatomy",

        // background stability
        "warping background, bending lines, moving walls, swimming textures, shifting objects",

        // anti-authentic / over-processing
        "beauty filter, plastic skin, airbrushed skin, heavy makeup, face retouching, face restoration",
        "HDR, over-sharpening, over-smoothing, high clarity, glossy skin, modern smartphone look",
    ].join(", ");
}

function cleanContext(desc?: string | null) {
    const s = (desc ?? "").trim().replace(/\s+/g, " ");
    if (!s) return null;
    return s.slice(0, 280);
}

function cleanUserPrompt(p?: string | null) {
    const s = (p ?? "").trim().replace(/\s+/g, " ");
    if (!s) return null;
    // garde-fou: user prompt court, sinon ça override tout
    return s.slice(0, 220);
}

export function buildBestPrompt(params: {
    description?: string | null;
    userPrompt?: string | null;
    mode?: "strict" | "soft";
}) {
    const ctx = cleanContext(params.description);
    const user = cleanUserPrompt(params.userPrompt);

    const base =
        params.mode === "strict"
            ? defaultCinematicPromptStrict()
            : defaultCinematicPromptSoft();

    const parts = [
        base,
        ctx
            ? `Context (mood only, do not change people/composition): ${ctx}`
            : null,
        user ? `User direction (must not conflict with constraints): ${user}` : null,

        // HARD CONSTRAINTS LAST (important)
        "HARD CONSTRAINTS: preserve identity exactly; keep original composition; no beautification; no face reconstruction; minimal micro-motion; stable background; single continuous shot; no jump cuts; no warping; match original photo texture/grain and lighting.",
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
