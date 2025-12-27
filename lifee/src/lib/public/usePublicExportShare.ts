// File: src/lib/public/usePublicExportShare.ts
"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {fetchJson} from "@/components/landing/interactiveDemo/utils";
import {match} from "ts-pattern";
import {AssetType} from "@/types/studio";
import {AlbumItem, Asset} from "@/lib/db/types";
import {AlbumDto, AlbumItemDto} from "@/types/studioHelp";

export type ApiRespStatus = "queued" | "rendering" | "done" | "error";

type ApiResp = {
    exportJobId: string;
    albumTitle: string;
    status: ApiRespStatus;
    progress: number;
    videoUrl: string | null;
    thumbnailUrl?: string | null;
    errorMessage: string | null;
    createdLabel?: string | null;
    createdBy?: string | null;
    album: AlbumDto;
};

function statusToKey(status: ApiResp["status"]): ApiRespStatus {
    return <ApiRespStatus>match(status)
        .with('queued', () => "share.export.status.queued")
        .with('rendering', () => "share.export.status.rendering")
        .with('error', () => "share.export.status.error")
        .with('done', () => "share.export.status.done")
        .exhaustive();
}

function safeShareUrl(exportShareId: string) {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    u.searchParams.delete("auth");
    // force canonical path (au cas où)
    u.pathname = `/share/exports/${exportShareId}`;
    return u.toString();
}

export function usePublicExportShare(params: { exportShareId: string }) {
    const {exportShareId} = params;

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);

    const [title, setTitle] = useState<string>("");
    const [createdLabel, setCreatedLabel] = useState<string>(""); // string ready-to-render
    const [createdBy, setCreatedBy] = useState<string>("");
    const [album, setAlbum] = useState<AlbumDto>();

    const [statusKey, setStatusKey] = useState<ApiRespStatus>(statusToKey("queued"));

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stop = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
    };

    useEffect(() => stop, []);

    useEffect(() => {
        let alive = true;

        const tick = async () => {
            try {
                const data = await fetchJson<ApiResp>(`/api/share/exports/${encodeURIComponent(exportShareId)}`, {
                    method: "GET",
                });

                if (!alive) return;

                setTitle(data.albumTitle || "");
                setProgress(typeof data.progress === "number" ? data.progress : 0);

                setStatusKey(statusToKey(data.status));

                // urls (signed)
                setVideoUrl(data.videoUrl ?? null);
                setThumbnailUrl(data.thumbnailUrl ?? null);

                // label/by (server-prepared if provided, else fallback)
                setCreatedLabel(data.createdLabel ?? "Créé récemment");
                setCreatedBy(data.createdBy ?? "un proche");

                setAlbum(data.album)

                const done = data.status === "done" || data.status === "error";
                if (!done) {
                    timerRef.current = setTimeout(tick, 15000);
                }
            } catch {
                // soft retry (cold start)
                if (!alive) return;
                timerRef.current = setTimeout(tick, 15000);
            }
        };

        stop();
        void tick();

        return () => {
            alive = false;
            stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportShareId]);

    const shareUrl = useMemo(() => safeShareUrl(exportShareId), [exportShareId]);

    return {
        album,
        videoUrl,
        thumbnailUrl,
        progress,
        data: {
            title,
            createdLabel,
            createdBy,
            shareUrl,
            statusLineKey: statusKey,
        },
    };
}
