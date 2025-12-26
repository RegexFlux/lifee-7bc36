// File: src/hooks/useInteractiveDemo.ts
"use client";

import {useEffect, useRef, useState} from "react";
import type {NextRouter} from "next/router";

import type {
    CreateJobResponse,
    DemoState,
    JobStatusResponse,
    LatestDemoResponse,
} from "@/types/interactiveDemo";

import {
    fetchJson,
    HttpError,
    isBlobUrl,
    safeFirstString,
} from "@/components/landing/interactiveDemo/utils";

import {useT} from "@/lib/i18n/useT";

type Params = {
    router: NextRouter;
};

const LS_KEY_NEW = "lifee:lastDemoGenerationId";
const LS_KEY_OLD = "lifee:lastDemoJobId";

function getQueryId(router: NextRouter): string | null {
    // migration: accepte generationId OU jobId
    const g = safeFirstString((router.query as any)?.generationId);
    const j = safeFirstString((router.query as any)?.jobId);
    return g || j || null;
}

function pickId(payload: any): string | null {
    return (
        safeFirstString(payload?.generationId) ||
        safeFirstString(payload?.id) ||
        safeFirstString(payload?.jobId) ||
        safeFirstString(payload?.data?.generationId) ||
        safeFirstString(payload?.data?.id) ||
        safeFirstString(payload?.data?.jobId) ||
        safeFirstString(payload?.result?.generationId) ||
        safeFirstString(payload?.result?.id) ||
        safeFirstString(payload?.result?.jobId) ||
        null
    );
}

function pickStatus(payload: any): string | null {
    return (
        safeFirstString(payload?.status) ||
        safeFirstString(payload?.data?.status) ||
        safeFirstString(payload?.result?.status) ||
        null
    );
}

function pickVideoUrl(payload: any): string | null {
    return (
        safeFirstString(payload?.resultUrl) ||
        safeFirstString(payload?.videoUrl) ||
        safeFirstString(payload?.data?.resultUrl) ||
        safeFirstString(payload?.data?.videoUrl) ||
        safeFirstString(payload?.result?.resultUrl) ||
        safeFirstString(payload?.result?.videoUrl) ||
        null
    );
}

function pickThumbnailUrl(payload: any): string | null {
    return (
        safeFirstString(payload?.thumbnailUrl) ||
        safeFirstString(payload?.data?.thumbnailUrl) ||
        safeFirstString(payload?.result?.thumbnailUrl) ||
        null
    );
}

function pickError(payload: any): string | null {
    return (
        safeFirstString(payload?.error) ||
        safeFirstString(payload?.data?.error) ||
        safeFirstString(payload?.result?.error) ||
        null
    );
}

function extractPublicPath(payload: any): string | null {
    return (
        safeFirstString(payload?.publicPath) ||
        safeFirstString(payload?.data?.publicPath) ||
        safeFirstString(payload?.result?.publicPath) ||
        null
    );
}

function absFromPublicPath(path: string) {
    // hook = client only
    return new URL(path, window.location.origin).toString();
}

export function useInteractiveDemo({router}: Params) {
    const {t} = useT();

    const [demoState, setDemoState] = useState<DemoState>("idle");
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    // ⚠️ "jobId" conserve l’API du composant, mais c’est maintenant un generationId
    const [jobId, setJobIdState] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
    };

    useEffect(() => stopPolling, []);

    // cleanup blob url
    useEffect(() => {
        return () => {
            if (photoPreview && isBlobUrl(photoPreview)) {
                try {
                    URL.revokeObjectURL(photoPreview);
                } catch {
                }
            }
        };
    }, [photoPreview]);

    const setGenerationIdInUrl = async (id?: string) => {
        const nextQuery = {...router.query} as Record<string, any>;

        // migration: on privilégie generationId
        if (id) nextQuery.generationId = id;
        else delete nextQuery.generationId;

        // on nettoie l’ancien param
        delete nextQuery.jobId;

        await router.replace({query: nextQuery}, undefined, {shallow: true});
    };

    const setJobId = async (id: string | null) => {
        setJobIdState(id);

        try {
            if (id) {
                localStorage.setItem(LS_KEY_NEW, id);
                localStorage.setItem(LS_KEY_OLD, id); // migration
            }
        } catch {
        }

        if (router.isReady) await setGenerationIdInUrl(id || undefined);
    };

    const setPhotoPreviewSmart = (next: string | null) => {
        if (!next) return;
        setPhotoPreview((prev) => {
            // blob local -> thumb distante : remplace + revoke
            if (prev && isBlobUrl(prev) && !isBlobUrl(next)) {
                try {
                    URL.revokeObjectURL(prev);
                } catch {
                }
            }
            return next;
        });
    };

    const ensureShareUrl = async (generationId: string) => {
        // évite de spam (appel idempotent, mais on le fait au max 1x / id côté hook)
        if (shareUrl) return;

        try {
            const payload = await fetchJson<any>(
                `/api/generations/${encodeURIComponent(generationId)}/share`,
                {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: "{}",
                }
            );

            const publicPath = extractPublicPath(payload) ?? `/slug/${generationId}`;
            setShareUrl(absFromPublicPath(publicPath));
        } catch {
            // fallback (ça marche si /slug/:id est public côté app)
            setShareUrl(absFromPublicPath(`/slug/${generationId}`));
        }
    };

    const hydrateFromJob = async (generationId: string) => {
        stopPolling();

        try {
            const data = await fetchJson<JobStatusResponse>(
                `/api/generations/${encodeURIComponent(generationId)}`
            );

            setJobIdState(generationId);

            const thumb = pickThumbnailUrl(data);
            if (thumb) setPhotoPreviewSmart(thumb);

            // share : on le crée/réactive une fois
            void ensureShareUrl(generationId);

            const status = pickStatus(data);

            if ((status === "succeeded" || status === "done") && pickVideoUrl(data)) {
                setVideoUrl(pickVideoUrl(data));
                setDemoState("success");
                stopPolling();
                return;
            }

            if (status === "failed" || status === "error") {
                setError(pickError(data) || t("demo.error.generation_failed"));
                setDemoState("failed");
                stopPolling();
                return;
            }

            setDemoState("generating");
            pollJob(generationId, true);
        } catch {
            setDemoState("idle");
        }
    };

    const pollJob = (generationId: string, immediate = false) => {
        stopPolling();

        const tick = async () => {
            try {
                const data = await fetchJson<JobStatusResponse>(
                    `/api/generations/${encodeURIComponent(generationId)}`
                );

                const thumb = pickThumbnailUrl(data);
                if (thumb) setPhotoPreviewSmart(thumb);

                const status = pickStatus(data);

                if ((status === "succeeded" || status === "done") && pickVideoUrl(data)) {
                    setVideoUrl(pickVideoUrl(data));
                    setDemoState("success");
                    stopPolling();
                } else if (status === "failed" || status === "error") {
                    setError(pickError(data) || t("demo.error.generation_failed"));
                    setDemoState("failed");
                    stopPolling();
                } else {
                    setDemoState("generating");
                }
            } catch {
                // cold start / réseau: on continue
            }
        };

        if (immediate) void tick();
        pollRef.current = setInterval(tick, 1500);
    };

    async function fetchLatestDemoId(): Promise<string | null> {
        // On suppose que /api/generations/index.ts supporte une variante “latest demo”
        const candidates = [
            "/api/generations?scope=demo&latest=day",
            "/api/generations?demo=1&latest=day",
            "/api/generations?scope=demo&mode=day&latest=1",
        ] as const;

        for (const url of candidates) {
            try {
                const payload = await fetchJson<LatestDemoResponse>(url);
                const id = pickId(payload) || pickId((payload as any)?.latest);
                if (id) return id;
            } catch {
                // try next
            }
        }
        return null;
    }

    // initial load: query generationId -> latest -> localStorage
    useEffect(() => {
        if (!router.isReady) return;

        const qId = getQueryId(router);
        if (qId) {
            void setJobId(qId);
            void hydrateFromJob(qId);
            return;
        }

        (async () => {
            // 1) server latest (IP/scope) via nouveaux endpoints
            const latest = await fetchLatestDemoId();
            if (latest) {
                await setJobId(latest);
                await hydrateFromJob(latest);
                return;
            }

            // 2) fallback localStorage
            try {
                const last = localStorage.getItem(LS_KEY_NEW) || localStorage.getItem(LS_KEY_OLD);
                if (last) {
                    await setJobId(last);
                    await hydrateFromJob(last);
                }
            } catch {
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady]);

    const uploadAndGenerate = async (file: File) => {
        stopPolling();

        setError(null);
        setVideoUrl(null);
        setShareUrl(null);

        // preview immédiat
        setPhotoPreview((prev) => {
            if (prev && isBlobUrl(prev)) {
                try {
                    URL.revokeObjectURL(prev);
                } catch {
                }
            }
            return URL.createObjectURL(file);
        });

        await setJobId(null);
        setDemoState("analyzing");

        const fd = new FormData();
        fd.append("file", file);

        try {
            const payload = await fetchJson<CreateJobResponse>("/api/generations", {
                method: "POST",
                body: fd,
            });

            const generationId = pickId(payload);
            if (!generationId) {
                setError(t("demo.error.upload_failed"));
                setDemoState("failed");
                return;
            }

            await setJobId(generationId);

            // share url: créé/réactive + stable pendant la génération
            await ensureShareUrl(generationId);

            setDemoState("generating");
            pollJob(generationId, true);
        } catch (e) {
            const err = e as unknown;

            if (err instanceof HttpError) {
                if (err.status === 429 || err.status === 403) {
                    setError(t("demo.error.quota"));
                    setDemoState("failed");
                    return;
                }
                setError(err.message || t("demo.error.upload_failed"));
                setDemoState("failed");
                return;
            }

            setError(t("demo.error.upload_failed"));
            setDemoState("failed");
        }
    };

    const openShare = () => {
        if (!shareUrl) return;
        window.open(shareUrl, "_blank", "noreferrer");
    };

    return {
        demoState,
        videoUrl,
        shareUrl,
        jobId,
        error,
        photoPreview,

        setPhotoPreviewSmart,

        hydrateFromJob,
        pollJob,
        stopPolling,

        uploadAndGenerate,
        openShare,
        setJobId,
    };
}
