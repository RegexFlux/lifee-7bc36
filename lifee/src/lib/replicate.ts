import Replicate from "replicate";

export const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const OWNER = "kwaivgi";
const MODEL = "kling-v2.5-turbo-pro";

let cachedVersion: { id: string; at: number } | null = null;

export async function getKlingVersionId() {
    if (cachedVersion && Date.now() - cachedVersion.at < 1000 * 60 * 30) return cachedVersion.id;

    const model = await replicate.models.get(OWNER, MODEL);
    const id = model.latest_version?.id;
    if (!id) throw new Error("Unable to resolve latest_version.id for Kling model");

    cachedVersion = { id, at: Date.now() };
    return id;
}

export function defaultLifeePrompt() {
    return [
        "Bring this photo to life as a happy, warm memory.",
        "Subtle natural motion, gentle camera push-in, soft sunlight, joyful mood.",
        "Keep faces and identity consistent, preserve composition and colors.",
        "Cinematic, realistic, smooth, no glitches, no warping.",
    ].join(" ");
}
