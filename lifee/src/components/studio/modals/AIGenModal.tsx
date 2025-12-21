"use client";

import React from "react";
import { Play, Wand2, X } from "lucide-react";
import type { Asset } from "@/types/studio";

export function AIGenModal(props: {
    open: boolean;
    source: Asset | null;
    credits: number;

    durationSec: number;
    onChangeDurationSec: (n: number) => void;

    prompt: string;
    onChangePrompt: (v: string) => void;

    onGenerate: () => void;
    onClose: () => void;
}) {
    if (!props.open) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in">
                <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex gap-2 items-center">
                        <Wand2 size={20} /> IA Vidéo
                    </h3>
                    <button onClick={props.onClose} aria-label="Fermer">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="text-xs text-slate-500">
                        Source: <span className="font-bold text-slate-800">{props.source?.title ?? "—"}</span>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">
                            Durée: {props.durationSec}s
                        </label>
                        <input
                            type="range"
                            min={1}
                            max={30}
                            value={props.durationSec}
                            onChange={(e) => props.onChangeDurationSec(parseInt(e.target.value, 10))}
                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Prompt</label>
                        <textarea
                            rows={3}
                            className="w-full border rounded-lg p-2 text-sm"
                            placeholder="Décrivez l'animation..."
                            value={props.prompt}
                            onChange={(e) => props.onChangePrompt(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={props.onGenerate}
                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg flex justify-center gap-2 disabled:opacity-60"
                        disabled={props.credits <= 0}
                        title={props.credits <= 0 ? "Crédits insuffisants" : "Générer"}
                    >
                        <Play size={18} fill="currentColor" /> Générer (-1 Crédit)
                    </button>
                </div>
            </div>
        </div>
    );
}
