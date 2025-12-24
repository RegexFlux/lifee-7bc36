"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layers, X, Upload, Wand2, ExternalLink, CheckCircle2, AlertTriangle, Loader2, Film } from "lucide-react";
import { useRouter } from "next/router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useVideoResultModal, VideoResultModal } from "@/hooks/useVideoResultModal";
import Dock from "@/components/landing/interactiveDemo/Dock";

export type DemoState = "idle" | "analyzing" | "generating" | "success" | "failed";

type Props = {
    onDownloadClick: () => void;
};

function safeFirstString(v: any): string | null {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : null;
    return null;
}


function PolaroidStack({ src }: { src: string }) {
    console.log("src", src);
    return (
        <div className="relative w-36 h-44 transform -rotate-6 transition-transform group-hover:-rotate-12 duration-500">
            <div className="absolute inset-0 bg-slate-200 p-2 pb-8 shadow-2xl rounded transform -rotate-12 border border-slate-400">
                <div className="w-full h-full bg-slate-300 overflow-hidden">
                    <img src={src} className="w-full h-full object-cover opacity-80 mix-blend-multiply" alt="polaroid1" />
                </div>
            </div>

            <div className="absolute inset-0 bg-slate-100 p-2 pb-8 shadow-2xl rounded transform -rotate-6 border border-slate-400">
                <div className="w-full h-full bg-slate-300 overflow-hidden">
                    <img src={src} className="w-full h-full object-cover opacity-80 mix-blend-multiply" alt="polaroid2" />
                </div>
            </div>

            <div className="absolute inset-0 z-40 bg-white p-2 pb-8 shadow-2xl rounded transform rotate-3 border border-slate-300">
                <div className="w-full h-full bg-slate-800 overflow-hidden mb-1">
                    <img src={src} className="w-full h-full object-cover" alt="polaroid3" />
                </div>
                <div className="h-1.5 w-16 bg-slate-200 rounded-full mx-auto" />
            </div>

            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-xs font-handwriting text-slate-400 whitespace-nowrap">
                Vos Photos
            </div>
        </div>
    );
}

export default function InteractiveDemo({ onDownloadClick }: Props) {
    const [demoState, setDemoState] = useState<DemoState>("idle");
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [jobId, setJobIdState] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState<boolean>(true);

    // ✅ NEW: preview photo for polaroids
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const router = useRouter();

    // ✅ keep URL query in sync (use replace to avoid polluting history)
    const setJobIdInUrl = async (id?: string) => {
        const nextQuery = { ...router.query };
        if (id) nextQuery.jobId = id;
        else delete nextQuery.jobId;

        await router.replace({ query: nextQuery }, undefined, { shallow: true });
    };

    const stopPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
    };

    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, []);

    // cleanup object URL
    useEffect(() => {
        return () => {
            if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
        };
    }, [photoPreview]);

    const setJobId = async (id: string | null) => {
        setJobIdState(id);
        try {
            if (id) localStorage.setItem("lifee:lastDemoJobId", id);
        } catch {}
        await setJobIdInUrl(id || undefined);
    };

    const hydrateFromJob = async (id: string) => {
        try {
            const r = await fetch(`/api/lifee/video/${encodeURIComponent(id)}`);
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Fetch job failed");

            setJobIdState(id);
            setShareUrl(data.shareUrl ?? null);

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

            // processing / queued etc.
            setDemoState("generating");
            pollJob(id, true);
        } catch (e: any) {
            // on n'affiche pas forcément l'erreur (cold start), mais on met un état safe
            setDemoState("idle");
        }
    };

    const pollJob = (id: string, immediate = false) => {
        stopPolling();

        const tick = async () => {
            try {
                const r = await fetch(`/api/lifee/video/${encodeURIComponent(id)}`);
                const data = await r.json();
                if (!r.ok) throw new Error(data?.error || "Polling error");

                setShareUrl(data.shareUrl ?? null);
                setPhotoPreview(data.thumbnailUrl ?? null);

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
                // réseau / cold start : on continue
            }
        };

        if (immediate) void tick();

        pollRef.current = setInterval(tick, 1500);
    };

    // ✅ NEW: when user lands: load existing job
    useEffect(() => {
        if (!router.isReady) return;

        const qJob = safeFirstString(router.query.jobId);
        if (qJob) {
            void setJobId(qJob);
            void hydrateFromJob(qJob);
            return;
        }

        // 1) ask server “latest job for this IP/scope” (recommended)
        (async () => {
            try {
                const r = await fetch("/api/lifee/demo/latest?mode=day", { method: "GET" });
                if (r.ok) {
                    const data = await r.json();
                    if (data?.jobId) {
                        await setJobId(data.jobId);
                        await hydrateFromJob(data.jobId);
                        return;
                    }
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

        // ✅ photo into polaroids instantly
        if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);

        await setJobId(null);

        setDemoState("analyzing");

        const fd = new FormData();
        fd.append("file", file);

        const r = await fetch("/api/lifee/video", { method: "POST", body: fd });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Upload failed");

        await setJobId(data.jobId);
        setShareUrl(data.shareUrl);
        setDemoState("generating");
        pollJob(data.jobId, true);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (!f) return;

        try {
            await uploadAndGenerate(f);
        } catch (err: any) {
            setError(err?.message || "Error");
            setDemoState("failed");
        }
    };

    const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        try {
            await uploadAndGenerate(f);
        } catch (err: any) {
            setError(err?.message || "Error");
            setDemoState("failed");
        }
    };

    const resultModal = useVideoResultModal({
        jobId,
        videoUrl,
        shareUrl,
        onDownloadClick,
        studioPath: "/studio",
    });

    const polaroidSrc = photoPreview ?? "examples/landing.jpg";

    const openShare = () => {
        if (!shareUrl) return;
        window.open(shareUrl, "_blank", "noreferrer");
    };

    return (
        <div className="relative group perspective-1000 lg:pl-10">
            {/* ✅ TOP-RIGHT Dock (homogène MiniAudioWidget) */}
            <Dock
                open={isOpen}
                state={demoState}
                jobId={jobId}
                shareUrl={shareUrl}
                videoUrl={videoUrl}
                error={error}
                onOpenResult={() => resultModal.setOpen(true)}
                onOpenShare={openShare}
                onClear={() => setIsOpen(false)}
            />

            {/* Left polaroids (now dynamic) */}
            <div className="absolute -left-12 -top-12 z-20 hidden lg:block pointer-events-none select-none">
                <svg className="absolute left-24 top-16 w-32 h-20 text-white z-30" viewBox="0 0 120 60" fill="none">
                    <path
                        d="M10 20 C 40 -10, 80 0, 100 30"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="animate-[draw_2s_ease-out_infinite]"
                        strokeDasharray="200"
                        strokeDashoffset="200"
                    />
                    <path
                        d="M99.5 22.0 L100 30 L92.8 26.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-[draw_2s_ease-out_infinite]"
                    />
                </svg>

                <PolaroidStack src={polaroidSrc} />
            </div>

            {/* Fullscreen result modal */}
            {videoUrl ? (
                <VideoResultModal
                    open={resultModal.open}
                    mounted={resultModal.mounted}
                    isMobile={resultModal.isMobile}
                    videoUrl={videoUrl}
                    shareUrl={shareUrl}
                    onClose={resultModal.close}
                    onDownload={resultModal.download}
                    onGoToStudio={resultModal.goToStudio}
                />
            ) : null}

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePick} />

            <div
                id="demo-area"
                className="relative bg-slate-800 backdrop-blur-xl border border-white/10 rounded-2xl pt-2 shadow-2xl overflow-hidden aspect-[4/3] flex flex-col z-10"
            >
                <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2 justify-between">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/20" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                        <div className="w-3 h-3 rounded-full bg-green-500/20" />
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-4">
                        Transformez votre premier souvenir
                        <X size={12} />
                    </p>
                </div>

                <div
                    className="flex-1 relative flex items-center justify-center h-96"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => {
                        if (demoState === "idle" || demoState === "failed") fileInputRef.current?.click();
                        if (demoState === "success" && videoUrl) resultModal.setOpen(true);
                    }}
                >
                    {/* Optional: subtle preview background when photo exists */}
                    {photoPreview && demoState !== "success" && (
                        <div className="absolute inset-0 opacity-[0.22]">
                            <img src={photoPreview} alt="" className="w-full h-full object-cover blur-[2px] scale-[1.05]" />
                            <div className="absolute inset-0 bg-slate-950/60" />
                        </div>
                    )}

                    {demoState === "idle" && (
                        <div className="text-center space-y-4 cursor-pointer relative">
                            <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <Upload size={32} className="text-slate-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-white">Créer mon Album Vidéo</h3>
                                <p className="text-sm text-slate-500">Cliquez ou glissez vos photos ici</p>
                            </div>
                        </div>
                    )}

                    {demoState === "analyzing" && (
                        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center">
                            <p className="text-sm font-mono text-indigo-300 animate-pulse">Upload & préparation…</p>
                        </div>
                    )}

                    {demoState === "generating" && (
                        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4" />
                            <p className="text-sm font-mono text-cyan-300">Génération vidéo en cours…</p>
                            {shareUrl && (
                                <button
                                    className="mt-3 text-xs text-cyan-200/80 underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openShare();
                                    }}
                                >
                                    Ouvrir le lien de partage
                                </button>
                            )}
                            <p className="mt-2 text-[11px] text-slate-400">Vous pouvez continuer à parcourir le site (dock en haut à droite).</p>
                        </div>
                    )}

                    {demoState === "failed" && (
                        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center px-6">
                            <p className="text-sm font-mono text-red-300">Erreur</p>
                            <p className="text-xs text-slate-400 mt-2">{error || "Une erreur est survenue."}</p>
                            <p className="text-xs text-slate-500 mt-3">Clique pour réessayer</p>
                        </div>
                    )}

                    {demoState === "success" && (
                        <div className="absolute inset-0 bg-black">
                            <div className="absolute inset-0 opacity-80">
                                {videoUrl ? (
                                    <video src={videoUrl} playsInline autoPlay muted className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-white/70 flex items-center justify-center h-full">Chargement…</div>
                                )}
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        resultModal.setOpen(true);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/15 backdrop-blur active:scale-[0.99] transition"
                                >
                                    Ouvrir en plein écran
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute -right-8 top-20 bg-slate-800/90 backdrop-blur border border-white/10 p-3 rounded-lg shadow-xl z-10">
                <Layers size={20} className="text-indigo-400 mb-2" />
                <div className="w-12 h-1 bg-slate-600 rounded mb-1" />
                <div className="w-8 h-1 bg-slate-600 rounded" />
            </div>

            <div className="absolute -left-4 bottom-20 bg-slate-800/90 backdrop-blur border border-white/10 p-3 rounded-lg shadow-xl z-10">
                <Wand2 size={20} className="text-cyan-400 mb-2" />
                <div className="w-10 h-1 bg-slate-600 rounded" />
            </div>
        </div>
    );
}
