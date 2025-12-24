import Replicate from "replicate";

export const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!,
});

// community model -> predictions.create attend `version` si pas `model` :contentReference[oaicite:1]{index=1}
export async function getLatestVersionId(owner: string, name: string) {
    const model = await replicate.models.get(owner, name); // retourne latest_version :contentReference[oaicite:2]{index=2}
    const latest = model?.latest_version?.id;
    if (!latest) throw new Error(`No latest_version for ${owner}/${name}`);
    return latest;
}