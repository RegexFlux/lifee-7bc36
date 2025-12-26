// File: src/lib/auth/useViewer.ts
import {useCallback, useEffect, useState} from "react";
import {apiGet} from "@/lib/api/client";
import {ViewerSchema, type ViewerDTO} from "@/lib/api/contracts";

const REFRESH_EVENT = "lifee:viewer-refresh";

export function emitViewerRefresh() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(REFRESH_EVENT));
    }
}

export function useViewer() {
    const [viewer, setViewer] = useState<ViewerDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiGet("/api/viewer", ViewerSchema);
            setViewer(data);
        } catch (e) {
            setError(e);
            setViewer(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const onRefresh = () => refresh();
        window.addEventListener(REFRESH_EVENT, onRefresh);
        return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
    }, [refresh]);

    return {viewer, loading, error, refresh};
}
