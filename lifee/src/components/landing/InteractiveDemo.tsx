import React, { useEffect, useRef, useState } from "react";
import { Layers, X, Upload, Wand2 } from "lucide-react";
import {useRouter} from "next/router";
import {StarDust} from "@/components/landing/StarDust";

type DemoState = "idle" | "analyzing" | "generating" | "success" | "failed";

type Props = {
    onDownloadClick: () => void;
};

export default function InteractiveDemo({ onDownloadClick }: Props) {
    const [demoState, setDemoState] = useState<DemoState>("idle");
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const router = useRouter();
    const setJobId = (jobId?: string) => router.push({ query: { ...router.query, jobId  } }, undefined, { shallow: true });

    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
        };
    }, []);

    const stopPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
    };

    const pollJob = (id: string) => {
        stopPolling();
        pollRef.current = setInterval(async () => {
            try {
                const r = await fetch(`/api/lifee/video/${encodeURIComponent(id)}`);
                const data = await r.json();

                if (!r.ok) throw new Error(data?.error || "Polling error");

                if (data.status === "succeeded" && data.videoUrl) {
                    setVideoUrl(data.videoUrl);
                    setShareUrl(data.shareUrl);
                    setDemoState("success");
                    stopPolling();
                } else if (data.status === "failed") {
                    setError(data.error || "Generation failed");
                    setDemoState("failed");
                    stopPolling();
                } else {
                    setDemoState("generating");
                }
            } catch (e: any) {
                // on n’échoue pas direct, on continue (réseau, cold start, etc.)
            }
        }, 1500);
    };

    const uploadAndGenerate = async (file: File) => {
        setError(null);
        setVideoUrl(null);
        setShareUrl(null);
        await setJobId(undefined);

        setDemoState("analyzing");

        const fd = new FormData();
        fd.append("file", file);
        // fd.append("prompt", "…"); // optionnel si tu veux un prompt custom

        const r = await fetch("/api/lifee/video", { method: "POST", body: fd });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Upload failed");

        await setJobId(data.jobId);
        setShareUrl(data.shareUrl);
        setDemoState("generating");
        pollJob(data.jobId);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) {
            try {
                await uploadAndGenerate(f);
            } catch (err: any) {
                setError(err?.message || "Error");
                setDemoState("failed");
            }
        }
    };

    const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            try {
                await uploadAndGenerate(f);
            } catch (err: any) {
                setError(err?.message || "Error");
                setDemoState("failed");
            }
        }
    };

    return (
        <div className="relative group perspective-1000 lg:pl-10">
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

                <div className="absolute left-40 top-10 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 transform -rotate-3 border border-cyan-500/30">
                    Generate
                </div>

                <div className="relative w-36 h-44 transform -rotate-6 transition-transform group-hover:-rotate-12 duration-500">
                    <div className="absolute inset-0 bg-slate-200 p-2 pb-8 shadow-2xl rounded transform -rotate-12 border border-slate-400">
                        <div className="w-full h-full bg-slate-300 overflow-hidden">
                            <img
                                src="examples/landing.jpg"
                                className="w-full h-full object-cover opacity-80 mix-blend-multiply"
                                alt="polaroid1"
                            />
                        </div>
                    </div>

                    <div className="absolute inset-0 bg-slate-100 p-2 pb-8 shadow-2xl rounded transform -rotate-6 border border-slate-400">
                        <div className="w-full h-full bg-slate-300 overflow-hidden">
                            <img
                                src="examples/landing.jpg"
                                className="w-full h-full object-cover opacity-80 mix-blend-multiply"
                                alt="polaroid2"
                            />
                        </div>
                    </div>

                    <div className="absolute inset-0 bg-white p-2 pb-8 shadow-2xl rounded transform rotate-3 border border-slate-300">
                        <div className="w-full h-full bg-slate-800 overflow-hidden mb-1">
                            <img
                                src="examples/landing.jpg"
                                className="w-full h-full object-cover"
                                alt="polaroid3"
                            />
                        </div>
                        <div className="h-1.5 w-16 bg-slate-200 rounded-full mx-auto" />
                    </div>

                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-xs font-handwriting text-slate-400 whitespace-nowrap">
                        Vos Photos
                    </div>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePick}
            />

            <div
                id="demo-area"
                className="relative bg-slate-800 backdrop-blur-xl border border-white/10 rounded-2xl pt-2 shadow-2xl overflow-hidden aspect-[4/3] flex flex-col z-10"
            >
                <div className="h-10 border-b border-white/5  flex items-center px-4 gap-2 justify-between">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/20" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                        <div className="w-3 h-3 rounded-full bg-green-500/20" />
                    </div>
                    <p className="text-sm text-slate-500"><X size={12} /></p>
                </div>

                <div
                    className="flex-1 relative flex items-center justify-center h-96"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => {
                        if (demoState === "idle" || demoState === "failed") fileInputRef.current?.click();
                    }}
                >
                    {demoState === "idle" && (
                        <div className="text-center space-y-4 cursor-pointer group/drop">
                            <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 relative">
                                <Upload size={32} className="text-slate-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-white">Créer mon Album Vidéo</h3>
                                <p className="text-sm text-slate-500">Cliquez ou glissez vos photos ici</p>
                            </div>
                        </div>
                    )}

                    {demoState === "analyzing" && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
                            <p className="text-sm font-mono text-indigo-300 animate-pulse">Upload & préparation…</p>
                        </div>
                    )}

                    {demoState === "generating" && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4" />
                            <p className="text-sm font-mono text-cyan-300">Génération vidéo en cours…</p>
                            {shareUrl && (
                                <a className="mt-3 text-xs text-cyan-200/80 underline" href={shareUrl} target="_blank" rel="noreferrer">
                                    Ouvrir le lien de partage
                                </a>
                            )}
                        </div>
                    )}

                    {demoState === "failed" && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center px-6">
                            <p className="text-sm font-mono text-red-300">Erreur</p>
                            <p className="text-xs text-slate-400 mt-2">{error || "Une erreur est survenue."}</p>
                            <p className="text-xs text-slate-500 mt-3">Clique pour réessayer</p>
                        </div>
                    )}

                    {demoState === "success" && (
                        <div className="absolute inset-0 bg-black">
                            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                {videoUrl ? (
                                    <video
                                        src={videoUrl}
                                        playsInline
                                        autoPlay
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-white/70">Chargement…</div>
                                )}
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                                <div>
                                    <div className="text-xs font-bold text-white mb-1">Votre Souvenir est prêt</div>
                                    {shareUrl && (
                                        <a className="text-[10px] text-cyan-200 underline font-mono" href={shareUrl} target="_blank" rel="noreferrer">
                                            Partager / Revisionner
                                        </a>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        onDownloadClick();
                                    }}
                                    className="bg-white text-black text-xs font-bold px-4 py-2 rounded hover:bg-indigo-50 transition-colors shadow-lg shadow-white/20"
                                >
                                    Télécharger
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
