// components/lifee/aigen/dialogs/GenerateDialog.tsx
"use client";

import * as React from "react";
import {
    ArrowRight,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Film,
    Loader2,
    Wand2,
} from "lucide-react";
import { CardShell} from "@/components/studio/aigen/CardShell";

export function GenerateDialog(props: Readonly<{
    canGenerate: boolean;
    credits: number;
    isRendering: boolean;
    timelineCount: number;
    suggestedPack: number;
    onPurchaseCredits?: (amount: number) => void;
    onGenerate: () => void;

    advancedOpen: boolean;
    onToggleAdvanced: () => void;
}>) {
    const noCredits = props.credits <= 8;

    return (
        <CardShell
            title="Générer"
            subtitle="Simple par défaut, 3 secondes"
            icon={<Wand2 size={18} />}
            right={
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-700 shadow-sm">
                    <Film size={12} className="text-stone-600" />
                    3s
                </div>
            }
        >
            <div className="flex flex-col gap-4">
                {noCredits && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 w-full">
                        <div className="text-sm font-semibold text-amber-900">
                            Plus de crédits — votre album prend forme ✨
                        </div>
                        <div className="mt-1 text-xs text-amber-800">
                            {props.timelineCount} souvenir(s) sur la timeline. Recharge recommandée :{" "}
                            <span className="font-semibold">{props.suggestedPack}</span> crédits.
                        </div>

                        <div className="mt-3 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => props.onPurchaseCredits?.(props.suggestedPack)}
                                disabled={!props.onPurchaseCredits}
                                className={[
                                    "w-full rounded-xl px-4 py-3 font-bold text-white shadow-sm flex items-center justify-center gap-2 transition",
                                    props.onPurchaseCredits
                                        ? "bg-stone-900 hover:bg-stone-800"
                                        : "bg-stone-300 cursor-not-allowed",
                                ].join(" ")}
                            >
                                <CreditCard size={16} />
                                Recharger {props.suggestedPack} crédits
                            </button>

                            <div className="text-[11px] text-amber-800/80">
                                Astuce : plus il y a de souvenirs, plus le film final est “wow”.
                            </div>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={props.onGenerate}
                    disabled={!props.canGenerate}
                    className={[
                        "w-full h-max rounded-2xl px-4 py-3 font-bold shadow-lg transition flex items-center justify-center gap-2 mt-2",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                        props.canGenerate
                            ? "bg-stone-900 text-white hover:bg-stone-800"
                            : "bg-stone-200 text-stone-500 cursor-not-allowed",
                    ].join(" ")}
                >
                    {props.isRendering ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Génération…
                        </>
                    ) : (
                        <>
                            Générer maintenant <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 mt-4">
                <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-stone-700">Ce que l’IA applique</div>
                    <div className="text-[11px] text-stone-500">invisible</div>
                </div>
                <div className="mt-1 text-[11px] text-stone-500">
                    Stabilité visage • anti-flicker • mouvement doux • rendu film
                </div>
            </div>

            <button
                type="button"
                onClick={props.onToggleAdvanced}
                className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                aria-expanded={props.advancedOpen}
            >
                Inspector avancé {props.advancedOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>

        </CardShell>
    );
}
