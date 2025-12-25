import type {Asset, MusicTrack, StudioBootstrap, TimelineItem} from "@/types/studio";

type DraftDTO = {
    draftId: string;
    status: "draft" | "paid" | "archived";
    items: { assetId: string; title: string; position: number; thumbnailUrl?: string }[];
    requiredCredits: number;
    quote: { requiredCredits: number; recommendedPackId: string; packs: any[] };
};

type AlbumOrderStatusDTO = {
    orderId: string;
    status: "generating" | "assembling" | "done" | "error";
    videos: { total: number; done: number; failed: number };
    export: null | { status: "queued" | "rendering" | "done" | "error"; progress: number; url?: string };
    finalUrl: string | null;
    error: string | null;
};


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
        credentials: "include",
        headers: {"Content-Type": "application/json", ...(init?.headers || {})},
        ...init,
    });
    if (!res.ok) throw new Error(await res.text());
    return safeJson<T>(res);
}

// ✅ Nouveau: FormData (NE PAS mettre Content-Type)
async function requestForm<T>(input: RequestInfo, form: FormData): Promise<T> {
    const res = await fetch(input, {
        method: "POST",
        credentials: "include",
        body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return safeJson<T>(res);
}

export const studioApi = {
        bootstrap: () => request<StudioBootstrap>("/api/studio/bootstrap"),

        uploadMedia: async (payload: { file: File; thumbnail?: File | null }) => {
            const fd = new FormData();
            fd.append("file", payload.file);
            if (payload.thumbnail) fd.append("thumbnail", payload.thumbnail);

            const res = await fetch("/api/studio/library/upload", {
                method: "POST",
                credentials: "include",
                body: fd,
            });

            if (!res.ok) throw new Error(await res.text());
            return res.json() as Promise<{
                fileUrl: string;
                thumbnailUrl?: string;
                fileKey: string;
                thumbnailKey?: string
            }>;
        },
        // Library
        createAsset: (payload: {
            title: string;
            type: "image" | "video";
            date: string; // "MM/YYYY"
            duration?: string;
            thumbnailKey?: string;
            fileKey?: string;
        }) => request<Asset>
        ("/api/studio/library", {method: "POST", body: JSON.stringify(payload)}),

        getClip: (clipId: string) =>
            request<{ clipId: string; assetId: string; type: "video" | "image"; url: string }>(
                `/api/studio/timeline/clips/${clipId}/get`
            ),

        deleteAsset:
            (id: string) => request<{ ok: true }>(`/api/studio/library/${id}`, {method: "DELETE"}),

        // Timeline (DB-driven)
        createClip:
            (payload: { assetId: string; position?: number | null }) =>
                request<TimelineItem>("/api/studio/timeline/clips", {method: "POST", body: JSON.stringify(payload)}),

        deleteClip:
            (clipId: string) =>
                request<{ ok: true }>(`/api/studio/timeline/clips/${clipId}/delete`, {method: "DELETE"}),

        reorderClips:
            (orderedClipIds: string[]) =>
                request<{ ok: true }>("/api/studio/timeline/clips/reorder", {
                    method: "POST",
                    body: JSON.stringify({orderedClipIds}),
                }),

        // AI
        generateVideoFromImage:
            (payload: { sourceAssetId: string; durationSec: number; prompt: string }) =>
                request<Asset>("/api/studio/generate", {method: "POST", body: JSON.stringify(payload)}),

        // Music / Credits
        listMusicPresets:
            () => request<MusicTrack[]>("/api/studio/music"),

        purchaseCredits:
            (amount: number) =>
                request<{ credits: number }>("/api/studio/credits/purchase", {
                    method: "POST",
                    body: JSON.stringify({amount})
                }),

        // Export
        startExport:
            (payload: { timelineClipIds: string[]; musicId?: string | null }) =>
                request<{ jobId: string }>("/api/studio/export", {method: "POST", body: JSON.stringify(payload)}),

        exportStatus:
            (jobId: string) =>
                request<{
                    status: "queued" | "rendering" | "done" | "error";
                    progress: number;
                    url?: string
                }>(`/api/studio/export/${jobId}`),

        albumDraft: () => request<DraftDTO>("/api/album/draft"),
        albumUploadToDraft: async (draftId: string, files: File[]) => {
            const fd = new FormData();
            fd.append("draftId", draftId);
            files.forEach((f) => fd.append("files", f));
            return requestForm<{ ok: true }>("/api/album/draft/upload", fd);
        },
        albumReorderDraft: (draftId: string, orderedAssetIds: string[]) =>
            request<{ ok: true }>("/api/album/draft/reorder", {
                method: "POST",
                body: JSON.stringify({draftId, orderedAssetIds})
            }),

        albumCheckout: (payload: { draftId: string; packId: string; successUrl: string; cancelUrl: string }) =>
            request<{ url: string }>("/api/album/checkout", {method: "POST", body: JSON.stringify(payload)}),

        albumConfirm: (payload: { draftId: string; stripeSessionId: string }) =>
            request<{ orderId: string }>("/api/album/confirm", {method: "POST", body: JSON.stringify(payload)}),

        albumOrderStatus: (orderId: string) =>
            request<AlbumOrderStatusDTO>(`/api/album/status/${orderId}`),
    }
;
