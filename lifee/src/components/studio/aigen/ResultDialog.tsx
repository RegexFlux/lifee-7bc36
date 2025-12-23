// components/lifee/aigen/dialogs/ResultDialog.tsx
"use client";

import * as React from "react";
import { CheckCircle2, Film, Sparkles, Stars } from "lucide-react";
import { CardShell} from "@/components/studio/aigen/CardShell";
import { clamp, phaseLabel} from "@/types/aigen";

export function ResultDialog(props: Readonly<{
    step: "idle" | "rendering" | "done" | "error";
    pct: number;
    qPhase: any;
    error: string | null;
    resultPreviewUrl: string | null;
    lines: string[];
}>) {
    const isRendering = props.step === "rendering";
    const isDone = props.step === "done";
    const isError = props.step === "error";
    const pct = clamp(props.pct, 0, 100);

    return (
        <CardShell
            title="Résultat"
            subtitle="Live + preview"
            icon={<Film size={18} />}
            right={
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-700 shadow-sm">
                    <Stars size={12} className="text-amber-500" />
                    {isDone ? "prêt" : isError ? "erreur" : isRendering ? "en cours" : "—"}
                </div>
            }
        >
            <div className="rounded-2xl overflow-hidden border border-stone-200 bg-black relative">
                <div className="aspect-[16/10] relative">
                    {props.resultPreviewUrl ? (
                        <video
                            src={props.resultPreviewUrl}
                            className="absolute inset-0 w-full h-full object-cover"
                            muted
                            playsInline
                            autoPlay
                            loop
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-xs text-white/80 flex items-center gap-2">
                                <Sparkles size={14} className="text-amber-200" />
                                Aperçu du résultat ici
                            </div>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

                    {isRendering && (
                        <div className="absolute bottom-3 left-3 right-3">
                            <div className="flex items-center justify-between text-[11px] text-white/80 mb-1">
                                <span className="font-semibold">{phaseLabel(props.qPhase)}</span>
                                <span className="tabular-nums">{Math.round(pct)}%</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${pct}%`,
                                        backgroundImage: "linear-gradient(90deg,#fb7185,#f59e0b)",
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {isDone && (
                        <div className="absolute bottom-3 left-3 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs text-white flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-green-300" />
                            Génération terminée
                        </div>
                    )}

                    {isError && (
                        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-rose-500/15 backdrop-blur border border-rose-200/20 px-3 py-2 text-xs text-rose-50">
                            {props.error || "Erreur pendant la génération."}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                <div className="text-xs font-semibold text-stone-700">Live</div>
                <div className="mt-2 space-y-1 max-h-36 overflow-auto pr-1">
                    {(props.lines || []).slice(-8).map((l, i) => (
                        <div key={i} className="text-[11px] text-stone-600 flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-stone-400/70" />
                            <span className="leading-snug">{l}</span>
                        </div>
                    ))}
                    {!props.lines?.length && (
                        <div className="text-[11px] text-stone-500">
                            Les étapes apparaîtront ici si l’API renvoie des logs.
                        </div>
                    )}
                </div>
            </div>
        </CardShell>
    );
}
