// File: src/hooks/usePublicShare.ts
"use client";

import * as React from "react";
import {fetchJson} from "@/components/landing/interactiveDemo/utils";
import type {PublicShareGetResponse} from "@/pages/api/share/[generationShareId]";

export type PublicShareState = {
    loading: boolean;
    error: string | null;
    data: PublicShareGetResponse;

    // dérivés
    canPlay: boolean;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    progress: number;
    status: PublicShareGetResponse["status"] | null;
    statusLineKey: PublicShareGetResponse["statusLineKey"] | null;
};

function isTerminal(status?: PublicShareGetResponse["status"] | null) {
    return status === "succeeded" || status === "failed" || status === "canceled";
}

export function usePublicShare(params: {
    generationShareId: string | null;
    pollMs?: number; // default 1500
    locale?: "fr" | "en"; // header pour API (optionnel)
}) {
    const pollMs = params.pollMs ?? 1500;

    const [state, setState] = React.useState<PublicShareState>({
        loading: true,
        error: null,
        data: {
            status: "starting",
            progress: 0,
            statusLineKey: "share.status.starting",
            title: null,
            createdLabel: "",
            createdBy: "",
            thumbnailUrl: "",
            shareUrl: ""
        },
        canPlay: false,
        videoUrl: null,
        thumbnailUrl: null,
        progress: 0,
        status: null,
        statusLineKey: null,
    });

    React.useEffect(() => {
        const id = params.generationShareId;
        if (!id) {
            setState((s) => ({...s, loading: false, error: null}));
            return;
        }

        let alive = true;
        let timer: any = null;
        const ctrl = new AbortController();

        const headers: Record<string, string> = {};
        if (params.locale) headers["x-lifee-locale"] = params.locale;

        const apply = (data: PublicShareGetResponse) => {
            const videoUrl = data.resultUrl ?? null;

            setState({
                loading: false,
                error: null,
                data,
                canPlay: Boolean(videoUrl),
                videoUrl,
                thumbnailUrl: data.thumbnailUrl ?? null,
                progress: Number(data.progress ?? 0),
                status: data.status ?? null,
                statusLineKey: data.statusLineKey ?? null,
            });

            if (isTerminal(data.status)) {
                if (timer) clearInterval(timer);
                timer = null;
            }
        };

        const tick = async () => {
            try {
                const data = await fetchJson<PublicShareGetResponse>(`/api/share/${encodeURIComponent(id)}`, {
                    method: "GET",
                    signal: ctrl.signal,
                    headers,
                });
                if (!alive) return;
                apply(data);
            } catch (e: any) {
                if (!alive) return;
                // Abort => ignore
                if (e?.name === "AbortError") return;
                setState((s) => ({...s, loading: false, error: e?.message || "Request failed"}));
            }
        };

        void tick();
        timer = setInterval(tick, pollMs);

        return () => {
            alive = false;
            ctrl.abort();
            if (timer) clearInterval(timer);
        };
    }, [params.generationShareId, pollMs, params.locale]);

    return state;
}
