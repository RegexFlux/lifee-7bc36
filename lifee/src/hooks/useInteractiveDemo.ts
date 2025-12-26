// File: src/hooks/useInteractiveDemo.ts
"use client";

import {useEffect, useRef, useState} from "react";
import type {NextRouter} from "next/router";

import type {CreateJobResponse, DemoState, JobStatusResponse, LatestDemoResponse} from "@/types/interactiveDemo";
import {fetchJson, HttpError, isBlobUrl, safeFirstString} from "@/components/landing/interactiveDemo/utils";
import {useT} from "@/lib/i18n/useT";

type Params = { router: NextRouter };

type AssetType = "image" | "video";

type PresignResp = {
    uploadUrl: string;
    key: string;
    expiresInSec: number;
};

type AssetDTO = {
    id: string;
    type: AssetType;
    fileKey: string;
    month: number;
    year: number;
};

type CreateAssetResp = { asset: AssetDTO };

function inferExt(file: File): string {
    const name = (file.name || "").toLowerCase();
    const m = name.match(/\.([a-z0-9]{1,10})$/);
    if (m?.[1]) return m[1];
    const mime = (file.type || "").toLowerCase();
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    return "bin";
}

async function putToPresignedUrl(uploadUrl: string, file: File) {
    const r = await fetch(uploadUrl, {
        method: "PUT",
        headers: {"Content-Type": file.type || "application/octet-stream"},
        body: file,
    });
    if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`S3 upload failed (${r.status}): ${txt || "?"}`);
    }
}

export function useInteractiveDemo({router}: Params) {
    const {t} = useT();

    const [demoState, setDemoState] = useState<DemoState>("idle");
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [generationId, setGenerationId] = useState<string | null>(null); // = generationId
    const [error, setError] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
    };

    useEffect(() => stopPolling, []);

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

    const setJobId = async (id: string | null) => {
        setGenerationId(id);
        try {
            if (id) localStorage.setItem("lifee:lastDemoGenerationId", id);
        } catch {
        }
        if (!router.isReady) return;

        const nextQuery = {...router.query} as Record<string, any>;
        if (id) nextQuery.generationId = id;
        else delete nextQuery.generationId;
        delete nextQuery.jobId; // compat ancien
        await router.replace({query: nextQuery}, undefined, {shallow: true});
    };

    const ensureShareUrl = async (generationId: string) => {
        try {
            const payload = await fetchJson<{
                ok: boolean;
                publicPath: string;
            }>(`/api/generations/${encodeURIComponent(generationId)}/share`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: "{}",
            });

            console.log('x', safeFirstString(payload?.publicPath));

            const publicPath =
                safeFirstString(payload?.publicPath) ||
                `/share/${generationId}`;


            console.log('pay', payload);

            const abs = new URL(publicPath, window.location.origin).toString();
            setShareUrl(abs);
        } catch (e) {
            console.error('error', e);
            setShareUrl(new URL(`/share/${generationId}`, window.location.origin).toString());
        }
    };

    const pollJob = (generationId: string, immediate = false) => {
        stopPolling();

        const tick = async () => {
            try {
                const data = await fetchJson<JobStatusResponse>(`/api/generations/${encodeURIComponent(generationId)}`);

                const status = safeFirstString(data.job.status) || "";
                const vUrl = safeFirstString(data.signed.resultUrl)

                console.log('ss', data)
                if ((status === "succeeded" || status === "done") && vUrl) {
                    setVideoUrl(vUrl);
                    setDemoState("success");
                    stopPolling();
                    return;
                }

                if (status === "failed" || status === "error") {
                    setError(safeFirstString((data.job.error) || t("demo.error.generation_failed")));
                    setDemoState("failed");
                    stopPolling();
                    return;
                }

                setDemoState("generating");
            } catch {
                // continue
            }
        };

        if (immediate) void tick();
        pollRef.current = setInterval(tick, 1500);
    };

    async function createAssetFromFile(file: File): Promise<AssetDTO> {
        // 1) presign
        const presign = await fetchJson<PresignResp>("/api/assets/presign", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                contentType: file.type || "application/octet-stream",
                ext: inferExt(file),
                type: "image" as AssetType,
            }),
        });

        // 2) upload PUT to S3
        await putToPresignedUrl(presign.uploadUrl, file);

        // 3) add asset (month/year obligatoires)
        const d = new Date();
        const body = {
            fileKey: presign.key,
            type: "image" as AssetType,
            title: (file.name || "").slice(0, 120) || undefined,
            month: d.getMonth() + 1,
            year: d.getFullYear(),
        };

        const created = await fetchJson<CreateAssetResp>("/api/assets", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body),
        });

        return created.asset;
    }

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

        await setGenerationId(null);
        setDemoState("analyzing");

        try {
            // ✅ Flow attendu
            const asset = await createAssetFromFile(file);

            const payload = await fetchJson<CreateJobResponse>("/api/generations", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    sourceAssetId: asset.id,
                    duration: 5,
                }),
                // Optionnel mais recommandé: idempotence côté front
                // headers: {"Content-Type":"application/json","Idempotency-Key": crypto.randomUUID()},
            });
            console.log('pp', payload);
            const generationId = safeFirstString(payload.generationId)

            if (!generationId) {
                setError(t("demo.error.upload_failed"));
                setDemoState("failed");
                return;
            }

            await setJobId(generationId);
            await ensureShareUrl(generationId);

            setDemoState("generating");
            pollJob(generationId, true);
        } catch (e) {
            const err = e as unknown;

            if (err instanceof HttpError) {
                if (err.status === 429 || err.status === 403 || err.status === 402) {
                    // 402 chez toi: demo already used / crédits insuffisants
                    setError(
                        err.status === 402
                            ? "Demo déjà utilisée sur ce réseau."
                            : t("demo.error.quota")
                    );
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

    useEffect(() => {
        if (!router.isReady) return;

        const raw = router.query.generationId;
        const generationId = typeof raw === "string" ? raw : null;
        if (!generationId) return;

        let cancelled = false;

        (async () => {
            try {
                await setJobId(generationId);
                pollJob(generationId);
                await ensureShareUrl(generationId);
                if (cancelled) return;
            } catch (e) {
                if (cancelled) return;
                console.error(e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [router.isReady, router.query.generationId]);

    return {
        demoState,
        videoUrl,
        shareUrl,
        generationId,
        error,
        photoPreview,
        uploadAndGenerate,
        openShare,
        pollJob,
        stopPolling,
        setGenerationId,
    };
}
