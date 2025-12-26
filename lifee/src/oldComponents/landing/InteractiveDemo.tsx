"use client";

import React, {useRef, useState} from "react";
import {Layers, X, Upload, Wand2} from "lucide-react";
import {useRouter} from "next/router";

import {useVideoResultModal, VideoResultModal} from "@/hooks/useVideoResultModal";

import Dock from "@/components/landing/interactiveDemo/Dock";
import PolaroidStack from "@/components/landing/interactiveDemo/PolaroidStack";
import {useInteractiveDemo} from "@/hooks/useInteractiveDemo";

type Props = {
    onDownloadClick: () => void;
};

export default function InteractiveDemo({onDownloadClick}: Props) {
    const router = useRouter();
    const demo = useInteractiveDemo({router});

    const [dockOpen, setDockOpen] = useState(true);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const resultModal = useVideoResultModal({
        videoUrl: demo.videoUrl,
        shareUrl: demo.shareUrl,
        onDownloadClick,
        studioPath: "/studio",
    });

    const polaroidSrc = demo.photoPreview ?? "examples/landing.jpg";

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (!f) return;
        await demo.uploadAndGenerate(f);
    };

    const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        await demo.uploadAndGenerate(f);
    };

    console.log({...demo})
    return (
        <div className="relative group perspective-1000 lg:pl-10">
            {/* ✅ TOP-RIGHT Dock */}
            {demo.demoState !== "idle" && (
                <Dock
                    open={dockOpen}
                    onOpen={() => setDockOpen(true)}
                    onMinimize={() => setDockOpen(false)}
                    state={demo.demoState}
                    jobId={demo.jobId}
                    shareUrl={demo.shareUrl}
                    videoUrl={demo.videoUrl}
                    error={demo.error}
                    onOpenResult={() => resultModal.setOpen(true)}
                    onOpenShare={demo.openShare}
                />)}

            {/* Left polaroids */}
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

                <PolaroidStack src={polaroidSrc}/>
            </div>

            {/* Fullscreen result modal */}
            {demo.videoUrl ? (
                <VideoResultModal
                    jobId={demo.jobId}
                    open={resultModal.open}
                    mounted={resultModal.mounted}
                    isMobile={resultModal.isMobile}
                    videoUrl={demo.videoUrl}
                    shareUrl={demo.shareUrl}
                    onClose={resultModal.close}
                    onDownload={resultModal.download}
                    onGoToStudio={resultModal.goToStudio}
                />
            ) : null}

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePick}/>

            <div
                id="demo-area"
                className="relative bg-slate-800 backdrop-blur-xl border border-white/10 rounded-2xl pt-2 shadow-2xl overflow-hidden aspect-[4/3] flex flex-col z-10"
            >
                <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2 justify-between">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/20"/>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20"/>
                        <div className="w-3 h-3 rounded-full bg-green-500/20"/>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-4">
                        Transformez votre premier souvenir
                        <X size={12}/>
                    </p>
                </div>

                <div
                    className="flex-1 relative flex items-center justify-center h-96"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => {
                        if (demo.demoState === "idle" || demo.demoState === "failed") fileInputRef.current?.click();
                        if (demo.demoState === "success" && demo.videoUrl) resultModal.setOpen(true);
                    }}
                >
                    {/* subtle preview background */}
                    {demo.photoPreview && demo.demoState !== "success" && (
                        <div className="absolute inset-0 opacity-[0.22]">
                            <img
                                src={demo.photoPreview}
                                alt=""
                                className="w-full h-full object-cover blur-[2px] scale-[1.05] hidden"
                            />
                            <div className="absolute inset-0 bg-slate-950/60"/>
                        </div>
                    )}

                    {demo.demoState === "idle" && (
                        <div className="text-center space-y-4 cursor-pointer relative">
                            <div
                                className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <Upload size={32} className="text-slate-400"/>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-white">Créer mon Album Vidéo</h3>
                                <p className="text-sm text-slate-500">Cliquez ou glissez vos photos ici</p>
                            </div>
                        </div>
                    )}

                    {demo.demoState === "analyzing" && (
                        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center">
                            <p className="text-sm font-mono text-indigo-300 animate-pulse">Upload & préparation…</p>
                        </div>
                    )}

                    {demo.demoState === "generating" && (
                        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center">
                            <div
                                className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4"/>
                            <p className="text-sm font-mono text-cyan-300">Génération vidéo en cours…</p>
                            {demo.shareUrl && (
                                <button
                                    className="mt-3 text-xs text-cyan-200/80 underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        demo.openShare();
                                    }}
                                >
                                    Ouvrir le lien de partage
                                </button>
                            )}
                            <p className="mt-2 text-[11px] text-slate-400">
                                Vous pouvez continuer à parcourir le site (dock en haut à droite).
                            </p>
                        </div>
                    )}

                    {demo.demoState === "failed" && (
                        <div
                            className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center px-6">
                            <p className="text-sm font-mono text-red-300">Erreur</p>
                            <p className="text-xs text-slate-400 mt-2">{demo.error || "Une erreur est survenue."}</p>
                            <p className="text-xs text-slate-500 mt-3">Clique pour réessayer</p>
                        </div>
                    )}

                    {demo.demoState === "success" && (
                        <div className="absolute inset-0 bg-black">
                            <div className="absolute inset-0 opacity-80">
                                {demo.videoUrl ? (
                                    <video src={demo.videoUrl} playsInline autoPlay muted
                                           className="w-full h-full object-cover"/>
                                ) : (
                                    <div
                                        className="text-white/70 flex items-center justify-center h-full">Chargement…</div>
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

            {/* Décors existants */}
            <div
                className="absolute -right-8 top-20 bg-slate-800/90 backdrop-blur border border-white/10 p-3 rounded-lg shadow-xl z-10">
                <Layers size={20} className="text-indigo-400 mb-2"/>
                <div className="w-12 h-1 bg-slate-600 rounded mb-1"/>
                <div className="w-8 h-1 bg-slate-600 rounded"/>
            </div>

            <div
                className="absolute -left-4 bottom-20 bg-slate-800/90 backdrop-blur border border-white/10 p-3 rounded-lg shadow-xl z-10">
                <Wand2 size={20} className="text-cyan-400 mb-2"/>
                <div className="w-10 h-1 bg-slate-600 rounded"/>
            </div>
        </div>
    );
}
