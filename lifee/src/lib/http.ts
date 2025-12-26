// src/lib/http.ts
export class HttpError extends Error {
    status: number;
    data: any;

    constructor(status: number, message: string, data?: any) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const r = await fetch(input, init);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new HttpError(r.status, data?.error || "Request failed", data);
    return data as T;
}

export function getExtFromName(name: string) {
    const m = name.toLowerCase().match(/\.([a-z0-9]{1,10})$/);
    return m?.[1] || "jpg";
}

export function guessAssetType(file: File): "image" | "video" {
    if (file.type.startsWith("video/")) return "video";
    return "image";
}
