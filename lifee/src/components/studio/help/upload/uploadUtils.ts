import {fetchJson} from "@/components/landing/interactiveDemo/utils";

export type UploadQueueItem = {
    id: string;
    file: File;
    previewUrl: string;
    type: "image" | "video";
    status: "queued" | "uploading" | "done" | "error";
    error?: string | null;
};

function extFromName(name: string) {
    const m = name.toLowerCase().match(/\.([a-z0-9]{1,10})$/);
    return m?.[1] ?? "bin";
}

function kindFromFile(file: File): "image" | "video" {
    return file.type.startsWith("video/") ? "video" : "image";
}

export async function uploadFilesToAssetsAndAttachToAlbum(params: {
    albumId: string;
    files: File[];
}) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const presign = await fetchJson<{
        items: Array<{ key: string; uploadUrl: string; type: "image" | "video" }>;
        expiresInSec: number;
    }>("/api/assets/presign-bulk", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            files: params.files.map((f) => ({
                contentType: f.type || "application/octet-stream",
                ext: extFromName(f.name),
                type: kindFromFile(f),
            })),
        }),
    });

    // PUT each file
    await Promise.all(
        presign.items.map(async (it, idx) => {
            const f = params.files[idx];
            const r = await fetch(it.uploadUrl, {
                method: "PUT",
                headers: {"Content-Type": f.type || "application/octet-stream"},
                body: f,
            });
            if (!r.ok) throw new Error(`Upload failed (${r.status})`);
        })
    );

    // register assets in DB
    const created = await fetchJson<{ assets: Array<{ id: string }> }>("/api/assets/bulk", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            items: presign.items.map((it) => ({
                fileKey: it.key,
                type: it.type,
                month,
                year,
            })),
        }),
    });

    const assetIds = created.assets.map((a) => a.id);

    // attach to album
    await fetchJson("/api/albums/" + encodeURIComponent(params.albumId) + "/items", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({assetIds}),
    });

    return {assetIds};
}
