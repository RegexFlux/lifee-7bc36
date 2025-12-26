// src/components/studio/welcome/WelcomeStickyCTA.tsx
"use client";

import React from "react";
import {Save, ArrowRight, Loader2} from "lucide-react";

export function WelcomeStickyCTA(props: {
    disabled: boolean;
    phase: string;
    progress: number;
    onSave: () => void;
    onOrganize: () => void;
    labelSave: string;
    labelOrganize: string;
}) {
    const busy = props.phase !== "idle" && props.phase !== "done";

    return (
        <div className="fixed bottom-4 left-0 right-0 z-[80] px-4">
            <div className="mx-auto max-w-6xl">
                <div
                    className="rounded-3xl border border-stone-200 bg-white/80 backdrop-blur shadow-lg px-4 py-3 flex items-center gap-3">
                    <div className="min-w-0">
                        <div className="text-xs font-black text-stone-900">Album</div>
                        <div className="text-[11px] text-stone-500">
                            {busy ? (
                                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin"/>
                  Upload… {props.progress}%
                </span>
                            ) : props.disabled ? (
                                "Ajoutez des fichiers pour continuer."
                            ) : (
                                "Prêt à organiser & sauvegarder."
                            )}
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={props.onSave}
                            disabled={props.disabled || busy}
                            className={[
                                "px-4 py-2 rounded-2xl text-sm font-black transition flex items-center gap-2",
                                props.disabled || busy
                                    ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-rose-600 to-amber-500 text-white hover:opacity-[0.98]",
                            ].join(" ")}
                        >
                            <Save size={16}/>
                            {props.labelSave}
                        </button>

                        <button
                            onClick={props.onOrganize}
                            disabled={props.disabled || busy}
                            className={[
                                "px-4 py-2 rounded-2xl border text-sm font-black transition flex items-center gap-2",
                                props.disabled || busy
                                    ? "border-stone-200 bg-white text-stone-400 cursor-not-allowed"
                                    : "border-stone-200 bg-white text-stone-900 hover:bg-stone-50",
                            ].join(" ")}
                        >
                            {props.labelOrganize}
                            <ArrowRight size={16} className="text-rose-600"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
