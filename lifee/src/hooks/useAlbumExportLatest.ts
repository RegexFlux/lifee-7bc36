// File: src/hooks/useAlbumExportLatest.ts
"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {fetchJson} from "@/components/landing/interactiveDemo/utils";

export type ExportJobDTO = {
    id: string;
    albumId: string;
    userId: string;
    status: "queued" | "rendering" | "done" | "error";
    progress: number;
    videoKey: string | null;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
};

export function useAlbumExportLatest(albumId: string, pollMs = 1500) {
    const [job, setJob] = useState<ExportJobDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isRunning = useMemo(() => job?.status === "queued" || job?.status === "rendering", [job?.status]);

    const stop = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
    };

    const refresh = async () => {
        setLoading(true);
        try {
            const data = await fetchJson<{ latest: ExportJobDTO | null }>(
                `/api/albums/${encodeURIComponent(albumId)}/exports?limit=1`,
                {method: "GET"}
            );
            setJob(data.latest ?? null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [albumId]);

    useEffect(() => {
        stop();
        if (!albumId) return;

        if (!isRunning) return;

        pollRef.current = setInterval(() => {
            void refresh().catch(() => {
            });
        }, pollMs);

        return stop;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [albumId, isRunning, pollMs]);

    return {job, loading, refresh, isRunning};
}