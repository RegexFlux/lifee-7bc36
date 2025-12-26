// File: src/hooks/useViewer.ts
"use client";

import {useCallback, useEffect, useState} from "react";
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

export function emitViewerRefresh() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(REFRESH_EVENT));
    }
}

export async function fetchViewer(): Promise<Viewer> {
    return fetchJson<Viewer>("/api/auth/me", {method: "GET"});
}

export function useViewer() {
    const [viewer, setViewer] = useState<Viewer | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const v = await fetchViewer();
            setViewer(v);
            return v;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return {
        viewer,
        loading,
        refresh,
        isGuest: viewer?.user?.type === "guest",
    };
}
