"use client";

import { useEffect, useRef, useState } from "react";
import type { NextRouter } from "next/router";

import type { CreateJobResponse, DemoState, JobStatusResponse, LatestDemoResponse} from "@/types/interactiveDemo";
import { fetchJson, HttpError, isBlobUrl, safeFirstString} from "@/components/landing/interactiveDemo/utils";

type Params = {
    router: NextRouter;
};

export function useInteractiveDemo({ router }: Params) {
    const [demoState, setDemoState] = useState<DemoState>("idle");
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
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
            if (photoPreview && isBlobUrl(photoPreview)) URL.revokeObjectURL(photoPreview);
        };
    }, [photoPreview]);

    const setJobIdInUrl = async (id?: string) => {
        const nextQuery = { ...router.query } as Record<string, any>;
        if (id) nextQuery.jobId = id;
        else delete nextQuery.jobId;

        await router.replace({ query: nextQuery }, undefined, { shallow: true });
    };

    const setJobId = async (id: string | null) => {
        setJobIdState(id);
        try {
            if (id) localStorage.setItem("lifee:lastDemoJobId", id);
        } catch {}
        if (router.isReady) await setJobIdInUrl(id || undefined);
    };

    const setPhotoPreviewSmart = (next: string | null) => {
        if (!next) return;
        setPhotoPreview((prev) => {
            // si on avait un blob local et qu'on reçoit une thumb S3 → on remplace + revoke
            if (prev && isBlobUrl(prev) && !isBlobUrl(next)) {
                try {
                    URL.revokeObjectURL(prev);
                } catch {}
            }
            return next;
        });
    };

    const hydrateFromJob = async (id: string) => {
        try {
            const data = await fetchJson<JobStatusResponse>(`/api/lifee/video/${encodeURIComponent(id)}`);

            setJobIdState(id);
            setShareUrl(data.shareUrl ?? null);

            if (data.thumbnailUrl) setPhotoPreviewSmart(data.thumbnailUrl);

            if (data.status === "succeeded" && data.videoUrl) {
                setVideoUrl(data.videoUrl);
                setDemoState("success");
                stopPolling();
                return;
            }

            if (data.status === "failed") {
                setError(data.error || "Generation failed");
                setDemoState("failed");
                stopPolling();
                return;
            }

            setDemoState("generating");
            pollJob(id, true);
        } catch {
            setDemoState("idle");
        }
    };

    const pollJob = (id: string, immediate = false) => {
        stopPolling();

        const tick = async () => {
            try {
                const data = await fetchJson<JobStatusResponse>(`/api/lifee/video/${encodeURIComponent(id)}`);

                setShareUrl(data.shareUrl ?? null);
                if (data.thumbnailUrl) setPhotoPreviewSmart(data.thumbnailUrl);

                if (data.status === "succeeded" && data.videoUrl) {
                    setVideoUrl(data.videoUrl);
                    setDemoState("success");
                    stopPolling();
                } else if (data.status === "failed") {
                    setError(data.error || "Generation failed");
                    setDemoState("failed");
                    stopPolling();
                } else {
                    setDemoState("generating");
                }
            } catch {
                // cold start/réseau: on continue
            }
        };

        if (immediate) void tick();
        pollRef.current = setInterval(tick, 1500);
    };

    // initial load: query jobId -> latest -> localStorage
    useEffect(() => {
        if (!router.isReady) return;

        const qJob = safeFirstString(router.query?.jobId);
        if (qJob) {
            void setJobId(qJob);
            void hydrateFromJob(qJob);
            return;
        }

        (async () => {
            // 1) server latest (IP/scope)
            try {
                const data = await fetchJson<LatestDemoResponse>("/api/lifee/demo/latest?mode=day");
                if (data?.jobId) {
                    await setJobId(data.jobId);
                    await hydrateFromJob(data.jobId);
                    return;
                }
            } catch {
                // ignore
            }

            // 2) fallback localStorage
            try {
                const last = localStorage.getItem("lifee:lastDemoJobId");
                if (last) {
                    await setJobId(last);
                    await hydrateFromJob(last);
                }
            } catch {}
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady]);

    const uploadAndGenerate = async (file: File) => {
        setError(null);
        setVideoUrl(null);
        setShareUrl(null);

        // preview immédiat (polaroids + fond)
        setPhotoPreview((prev) => {
            if (prev && isBlobUrl(prev)) {
                try {
                    URL.revokeObjectURL(prev);
                } catch {}
            }
            return URL.createObjectURL(file);
        });

        await setJobId(null);
        setDemoState("analyzing");

        const fd = new FormData();
        fd.append("file", file);

        try {
            const data = await fetchJson<CreateJobResponse>("/api/lifee/video", { method: "POST", body: fd });

            await setJobId(data.jobId);
            setShareUrl(data.shareUrl);
            setDemoState("generating");
            pollJob(data.jobId, true);
        } catch (e) {
            const err = e as unknown;

            if (err instanceof HttpError) {
                // 429 / 403 -> quota IP
                if (err.status === 429 || err.status === 403) {
                    setError("Limite atteinte : 1 génération par IP (revenez demain).");
                    setDemoState("failed");
                    return;
                }
                setError(err.message || "Upload failed");
                setDemoState("failed");
                return;
            }

            setError("Upload failed");
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
