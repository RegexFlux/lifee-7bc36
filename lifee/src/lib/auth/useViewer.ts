// File: src/hooks/useViewer.ts
"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {fetchJson} from "@/components/landing/interactiveDemo/utils";

export type ViewerUserType = "guest" | "normal";

export type ViewerUser = {
    id: string;
    email: string;
    type: ViewerUserType;
    credits: number;
    createdAt: string;
};

export type Viewer = {
    user: ViewerUser;
    session: { id: string; isNew: boolean };
};

const REFRESH_EVENT = "lifee:viewer-refresh";

/** ✅ cache module-level (partagé entre toutes les instances de useViewer) */
let viewerCache: Viewer | null = null;
let inflight: Promise<Viewer> | null = null;

export function emitViewerRefresh() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(REFRESH_EVENT));
}

export async function fetchViewer(): Promise<Viewer> {
    return fetchJson<Viewer>("/api/auth/me", {method: "GET"});
}

/** ✅ fetch unique, réutilise la promesse si plusieurs appels simultanés */
async function fetchViewerOnce(): Promise<Viewer> {
    if (viewerCache) return viewerCache;
    if (inflight) return inflight;

    inflight = (async () => {
        const v = await fetchViewer();
        viewerCache = v;
        return v;
    })();

    try {
        return await inflight;
    } finally {
        inflight = null;
    }
}

export function useViewer() {
    const [viewer, setViewer] = useState<Viewer | null>(() => viewerCache);
    const [loading, setLoading] = useState(!viewerCache);

    const mountedRef = useRef(true);
    useEffect(() => () => {
        mountedRef.current = false;
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            // refresh force bypass cache
            inflight = null;
            viewerCache = null;

            const v = await fetchViewerOnce();
            if (mountedRef.current) setViewer(v);
            return v;
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        // ✅ si cache déjà présent, pas de refetch
        if (viewerCache) return;
        void fetchViewerOnce().then((v) => {
            if (!mountedRef.current) return;
            setViewer(v);
            setLoading(false);
        });
    }, []);

    // (optionnel) écoute refresh global si tu l’utilises
    useEffect(() => {
        const onRefresh = () => void refresh();
        window.addEventListener(REFRESH_EVENT, onRefresh);
        return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
    }, [refresh]);

    return {
        viewer,
        loading,
        refresh,
        isGuest: viewer?.user?.type === "guest",
    };
}
