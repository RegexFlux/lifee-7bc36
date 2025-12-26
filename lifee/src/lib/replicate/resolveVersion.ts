// src/lib/replicate/resolveVersion.ts
const cache = new Map<string, { version: string; exp: number }>();

export async function resolveReplicateVersion(modelRef: string) {
    // modelRef: "owner/name" OU "owner/name:versionId" OU "64hex"
    if (/^[a-f0-9]{64}$/i.test(modelRef)) return modelRef;
    if (modelRef.includes(":")) return modelRef;

    const now = Date.now();
    const hit = cache.get(modelRef);
    if (hit && hit.exp > now) return hit.version;

    const [owner, name] = modelRef.split("/");
    if (!owner || !name) throw new Error("Invalid model ref");

    // GET model → latest_version.id :contentReference[oaicite:2]{index=2}
    const r = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, {
        headers: {Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`},
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.detail || "Replicate models.get failed");

    const versionId = data?.latest_version?.id;
    if (!versionId) throw new Error("Missing latest_version.id");

    cache.set(modelRef, {version: versionId, exp: now + 1000 * 60 * 10}); // 10 min
    return versionId;
}
