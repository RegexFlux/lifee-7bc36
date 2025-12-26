// src/lib/assets/keys.ts
import crypto from "crypto";

export function sanitizeExt(ext: string) {
    return ext.replace(".", "").toLowerCase().slice(0, 10);
}

export function makeAssetObjectKey(params: { userId: string; ext: string; kind: "image" | "video" }) {
    const id = crypto.randomUUID();
    const clean = sanitizeExt(params.ext);
    return `lifee/users/${params.userId}/assets/${params.kind}/${id}.${clean}`;
}

export function makeAssetThumbnailObjectKey(params: { userId: string; assetId: string; ext?: string }) {
    const ext = (params.ext || "jpg").replace(/^\./, "");
    return `lifee/users/${params.userId}/assets/thumbs/${params.assetId}.${ext}`;
}