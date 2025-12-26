// src/hooks/useAssetUrl.ts
"use client";

import {useEffect, useRef, useState} from "react";
import {fetchJson} from "@/components/landing/interactiveDemo/utils";

type AssetUrlResp = {
    url: string;
    thumbnailUrl: string | null;
    expiresInSec: number;
};

type Params = {
    assetId: string;
    // utile pour décider si on doit attendre un thumb
    type: "image" | "video";
    // si true, on retente quand thumb absent
    retryThumb?: boolean;
};

const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];

export function useAssetUrl(params: Params) {
    const [data, setData] = useState<AssetUrlResp | null>(null);
    const [loading, setLoading] = useState(true);

    const attemptRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const aliveRef = useRef(true);

    const clearTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
    };

    const load = async () => {
        setLoading(true);
        try {
            // no-store : évite que le navigateur te serve un thumbnailUrl=null “caché”
            const r = await fetch(`/api/assets/${encodeURIComponent(params.assetId)}/url`, {
                method: "GET",
                cache: "no-store",
                headers: {"Content-Type": "application/json"},
            });
            const json = (await r.json().catch(() => ({}))) as any;
            if (!r.ok) throw new Error(json?.error || "Failed to load asset url");

            if (!aliveRef.current) return;

            setData(json);
            setLoading(false);

            // retry thumb only for videos
            const shouldRetry =
                params.retryThumb &&
                params.type === "video" &&
                (!json?.thumbnailUrl || json.thumbnailUrl === null) &&
                attemptRef.current < BACKOFF_MS.length;

            if (shouldRetry) {
                const delay = BACKOFF_MS[attemptRef.current++];
                clearTimer();
                timerRef.current = setTimeout(() => {
                    if (!aliveRef.current) return;
                    void load();
                }, delay);
            }
        } catch {
            if (!aliveRef.current) return;
            setLoading(false);
            // en cas d'erreur réseau, on peut aussi retenter un peu si c'est une vidéo
            if (params.type === "video" && params.retryThumb && attemptRef.current < BACKOFF_MS.length) {
                const delay = BACKOFF_MS[attemptRef.current++];
                clearTimer();
                timerRef.current = setTimeout(() => {
                    if (!aliveRef.current) return;
                    void load();
                }, delay);
            }
        }
    };

    useEffect(() => {
        aliveRef.current = true;
        attemptRef.current = 0;
        clearTimer();
        void load();

        return () => {
            aliveRef.current = false;
            clearTimer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.assetId]);

    return {
        data,
        loading,
        url: data?.url ?? null,
        thumbnailUrl: data?.thumbnailUrl ?? null,
        isThumbPending: params.type === "video" && !!params.retryThumb && !!data && !data.thumbnailUrl,
        refetch: load,
    };
}
