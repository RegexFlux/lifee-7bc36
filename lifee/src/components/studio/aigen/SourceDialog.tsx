// components/lifee/aigen/dialogs/SourceDialog.tsx
"use client";

import * as React from "react";
import { Image as ImageIcon, Sparkles } from "lucide-react";
import type { Asset } from "@/types/studio";
import { CardShell} from "@/components/studio/aigen/CardShell";
import { phaseLabel} from "@/types/aigen";

export function SourceDialog(props: Readonly<{
    source: Asset | null;
    credits: number;
    qPhase: any;
    qScore: number | null;
    pct: number;
    isRendering: boolean;
    thumbnailUrl: string | null;
}>) {
    const score = props.qScore ?? (props.isRendering ? props.pct : 0);

    console.log(',,', {...props})

    return (
        <CardShell
            title="Source"
            subtitle="La photo que l’IA va animer"
            icon={<ImageIcon size={18} />}
            right={
                <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-stone-400">Crédits</div>
                    <div className="text-sm font-semibold text-stone-900">{props.credits}</div>
                </div>
            }
        >
            <div className="rounded-2xl overflow-hidden border border-stone-200 bg-black relative">
                <div className="aspect-[4/3] relative">
                    {props.source?.thumbnailUrl ? (
                        <img
                            src={props.source.thumbnailUrl}
                            className="absolute inset-0 w-full h-full object-contain"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-xs text-white/80 flex items-center gap-2">
                                <Sparkles size={14} className="text-amber-200" />
                                Aperçu live pendant la génération
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                <div className="text-xs text-stone-700 font-semibold">Restauration qualité (auto)</div>
                <div className="mt-1 text-[11px] text-stone-500">
                    Nettoyage • Netteté • Détails • (Couleurs en option avancée)
                </div>
            </div>

            <div className="mt-3 text-xs text-stone-500">
                <span className="font-semibold text-stone-700">Photo :</span>{" "}
                {props.source ? props.source.title : "—"}
            </div>
        </CardShell>
    );
}
