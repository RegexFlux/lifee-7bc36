// src/lib/studioApi.ts
import type { Asset, TimelineItem, MusicTrack, StudioBootstrap } from "@/types/studio";

async function safeJson<T>(res: Response): Promise<T> {
    const text = await res.text();
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(text || `HTTP ${res.status}`);
    }
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const res = await fetch(input, {
        headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
        ...init,
    });
    if (!res.ok) throw new Error(await res.text());
    return safeJson<T>(res);
}

export const studioApi = {
    bootstrap: () => request<StudioBootstrap>("/api/studio/bootstrap"),

    createAsset: (payload: {
        title: string;
        type: "image" | "video";
        date: string; // "MM/YYYY"
        duration?: string;
        // si upload fichier: passe plutôt par FormData côté route, ici on reste JSON
        fileUrl?: string; // optionnel si déjà upload ailleurs
        thumbnailUrl?: string;
    }) => request<Asset>("/api/library", { method: "POST", body: JSON.stringify(payload) }),

    deleteAsset: (id: number) => request<{ ok: true }>(`/api/library/${id}`, { method: "DELETE" }),

    saveTimeline: (timeline: TimelineItem[]) =>
        request<{ ok: true }>("/api/timeline", { method: "PUT", body: JSON.stringify({ timeline }) }),

    generateVideoFromImage: (payload: {
        sourceAssetId: number;
        durationSec: number;
        prompt: string;
    }) => request<Asset & { context: string; isGenerated: true }>(
        "/api/generate",
        { method: "POST", body: JSON.stringify(payload) }
    ),

    listMusicPresets: () => request<MusicTrack[]>("/api/music"),

    startExport: (payload: { timeline: TimelineItem[]; musicId?: string | null }) =>
        request<{ jobId: string }>("/api/export", { method: "POST", body: JSON.stringify(payload) }),

    exportStatus: (jobId: string) =>
        request<{ status: "queued" | "rendering" | "done" | "error"; progress: number; url?: string }>(
            `/api/export/${jobId}`
        ),
};
