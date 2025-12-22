// src/hooks/useClipVideoUrl.ts
"use client";

import { useEffect, useState } from "react";
import { studioApi } from "@/lib/studioApi";

export function useClipVideoUrl(clipId?: string) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cache = new Map<string, string>();

    useEffect(() => {

        if (!clipId) return;

        let cancelled = false;
        setLoading(true);
        setError(null);
        if (cache.has(clipId)) {
            setUrl(cache.get(clipId)!);
            return;
        }

        studioApi
            .getClip(clipId)
            .then((res) => {
                if (!cancelled) setUrl(res.url);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || "Failed to load clip");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [clipId]);

    return { url, loading, error };
}
