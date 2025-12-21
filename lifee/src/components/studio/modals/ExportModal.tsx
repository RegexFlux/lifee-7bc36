"use client";

import React from "react";
import { Download, Loader2, Play, Share2, X } from "lucide-react";
import type { MusicTrack } from "@/types/studio";

export function ExportModal(props: {
    open: boolean;
    step: "idle" | "rendering" | "done" | "error";
    progress: number; // 0..100
    audioTrack: MusicTrack | null;

    onClose: () => void;
    onDownload: () => void;
    onShare: () => void;
}) {
    if (!props.open) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[80] flex flex-col items-center justify-center p-4 text-white">
            <button
                onClick={props.onClose}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20"
                aria-label="Fermer"
            >
                <X size={18} />
            </button>

            {props.step === "rendering" ? (
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-indigo-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold">Création de votre film...</h2>
                    <p className="text-gray-400 mt-2">Assemblage des souvenirs en cours</p>

                    <div className="mt-6 w-full max-w-sm">
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all"
                                style={{ width: `${Math.max(0, Math.min(100, props.progress))}%` }}
                            />
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                            {Math.round(props.progress)}%
                        </div>
                    </div>
                </div>
            ) : props.step === "done" ? (
                <div className="w-full max-w-md bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                    <div className="aspect-video bg-black flex items-center justify-center">
                        <Play size={48} className="text-white opacity-80" />
                    </div>
                    <div className="p-6">
                        <h3 className="text-xl font-bold mb-1">Film Souvenir Prêt !</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            1080p • 60fps • {props.audioTrack ? props.audioTrack.title : "Sans audio"}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={props.onShare}
                                className="py-3 bg-slate-700 rounded-xl font-bold flex justify-center gap-2"
                            >
                                <Share2 size={18} /> Partager
                            </button>
                            <button
                                onClick={props.onDownload}
                                className="py-3 bg-indigo-600 rounded-xl font-bold flex justify-center gap-2"
                            >
                                <Download size={18} /> Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            ) : props.step === "error" ? (
                <div className="text-center">
                    <h2 className="text-xl font-bold">Export échoué</h2>
                    <p className="text-gray-400 mt-2">Une erreur est survenue pendant le rendu.</p>
                    <button
                        onClick={props.onClose}
                        className="mt-6 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold"
                    >
                        Fermer
                    </button>
                </div>
            ) : (
                <div className="text-center">
                    <h2 className="text-xl font-bold">Exporter</h2>
                    <p className="text-gray-400 mt-2">Lance le rendu quand tu es prêt.</p>
                </div>
            )}
        </div>
    );
}
