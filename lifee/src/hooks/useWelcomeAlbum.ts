// src/hooks/useWelcomeAlbum.ts
"use client";

import {useCallback, useMemo, useState} from "react";
import {fetchJson, getExtFromName, guessAssetType, HttpError} from "@/lib/http";

type PresignBulkResp = {
    items: Array<{ key: string; uploadUrl: string; type: "image" | "video" }>;
    expiresInSec: number;
};

type BulkCreateAssetsResp = {
    assets: Array<{
        id: string;
        userId: string;
        type: "image" | "video";
        fileKey: string;
        title: string | null;
        month: number;
        year: number;
        createdAt: string;
    }>;
};

type CreateAlbumResp = {
    album: { id: string; title: string; mode: "studio_help" | "studio_pro"; createdAt: string; updatedAt: string };
};

type BulkAddAlbumItemsResp = {
    albumItems: Array<{ id: string; albumId: string; assetId: string; position: number }>;
};

export type UploadStep =
    | { phase: "idle" }
    | { phase: "presign"; total: number }
    | { phase: "upload"; total: number; done: number }
    | { phase: "register"; total: number }
    | { phase: "attach"; total: number }
    | { phase: "done"; total: number };

export function useWelcomeAlbum(params: { albumId?: string | null }) {
    const [albumId, setAlbumId] = useState<string | null>(params.albumId ?? null);

    const [step, setStep] = useState<UploadStep>({phase: "idle"});
    const [error, setError] = useState<string | null>(null);

    const progress = useMemo(() => {
        if (step.phase === "upload") return step.total ? Math.round((step.done / step.total) * 100) : 0;
        if (step.phase === "presign") return 5;
        if (step.phase === "register") return 85;
        if (step.phase === "attach") return 93;
        if (step.phase === "done") return 100;
        return 0;
    }, [step]);

    const ensureAlbum = useCallback(async (): Promise<string> => {
        if (albumId) return albumId;
        const r = await fetchJson<CreateAlbumResp>("/api/albums", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({})
        });
        setAlbumId(r.album.id);
        return r.album.id;
    }, [albumId]);

    const uploadFilesToAlbum = useCallback(async (files: File[]) => {
        setError(null);

        const cleaned = files.filter(Boolean).slice(0, 20); // cohérent avec presign-bulk max=20
        if (!cleaned.length) return;

        const aId = await ensureAlbum();

        try {
            // 1) presign-bulk
            setStep({phase: "presign", total: cleaned.length});

            const presignBody = {
                files: cleaned.map((f) => ({
                    contentType: f.type || "application/octet-stream",
                    ext: getExtFromName(f.name),
                    type: guessAssetType(f),
                })),
            };

            const presigned = await fetchJson<PresignBulkResp>("/api/assets/presign-bulk", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(presignBody),
            });

            // 2) PUT uploads (en série pour simplicité; tu pourras paralléliser 3-4 plus tard)
            setStep({phase: "upload", total: cleaned.length, done: 0});

            for (let i = 0; i < cleaned.length; i++) {
                const f = cleaned[i];
                const it = presigned.items[i];
                if (!it?.uploadUrl || !it?.key) throw new Error("Presign mismatch");

                const put = await fetch(it.uploadUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": f.type || "application/octet-stream",
                    },
                    body: f,
                });

                if (!put.ok) {
                    const text = await put.text().catch(() => "");
                    throw new Error(`Upload failed (${put.status}) ${text?.slice(0, 120)}`);
                }

                setStep((s) => (s.phase === "upload" ? {...s, done: s.done + 1} : s));
            }

            // 3) bulk create assets
            setStep({phase: "register", total: cleaned.length});

            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            const bulkCreate = await fetchJson<BulkCreateAssetsResp>("/api/assets/bulk", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    items: presigned.items.map((it, idx) => ({
                        fileKey: it.key,
                        type: it.type,
                        title: cleaned[idx]?.name?.slice(0, 120),
                        month,
                        year,
                    })),
                }),
            });

            // 4) attach to album
            setStep({phase: "attach", total: bulkCreate.assets.length});

            await fetchJson<BulkAddAlbumItemsResp>(`/api/albums/${encodeURIComponent(aId)}/items/bulk`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({assetIds: bulkCreate.assets.map((a) => a.id)}),
            });

            setStep({phase: "done", total: cleaned.length});
            return {albumId: aId};
        } catch (e: any) {
            if (e instanceof HttpError) {
                setError(e.message || "Erreur");
            } else {
                setError(e?.message || "Erreur");
            }
            setStep({phase: "idle"});
            throw e;
        }
    }, [ensureAlbum]);

    return {
        albumId,
        step,
        progress,
        error,
        uploadFilesToAlbum,
        ensureAlbum,
        reset: () => {
            setError(null);
            setStep({phase: "idle"});
        },
    };
}
