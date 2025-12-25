// components/shared/PromoRoulette.tsx
"use client";

import React, {useMemo, useState} from "react";
import {Loader2, Sparkles, Ticket} from "lucide-react";
import type {Tier, AppliedPromoQuote, SpinPromoResponse} from "@/types/billing";

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

export function PromoRoulette(props: Readonly<{
    tier: Tier;
    packId: string;
    disabled?: boolean;
    hasSpun: boolean;
    onApplied: (quote: AppliedPromoQuote) => void;
}>) {
    const [spinning, setSpinning] = useState(false);
    const canSpin = !props.disabled && !props.hasSpun && !spinning && !!props.packId;

    const labels = useMemo(
        () => ["-5%", "-10%", "-15%", "-20%", "-25%", "+10 crédits", "+20 crédits", "Bonus surprise"],
        []
    );

    async function spin() {
        if (!canSpin) return;
        setSpinning(true);

        try {
            const r = await fetch("/api/album/promo/spin", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({tier: props.tier, packId: props.packId}),
            });

            const data = (await r.json()) as SpinPromoResponse;
            if (!data.ok) throw new Error(data.error);

            // petit délai “casino”
            window.setTimeout(() => {
                props.onApplied(data.quote);
                setSpinning(false);
            }, 900);
        } catch {
            setSpinning(false);
        }
    }

    return (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div
                className="px-5 py-4"
                style={{
                    background:
                        "radial-gradient(900px 180px at 10% 0%, rgba(244,63,94,0.16), transparent 55%), radial-gradient(900px 180px at 90% 100%, rgba(245,158,11,0.18), transparent 55%), linear-gradient(180deg, rgba(15,23,42,0.02), rgba(15,23,42,0))",
                }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[15px] font-black text-slate-900 flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-rose-600"/>
                            Roulette promo
                            <span
                                className="ml-1 rounded-full bg-slate-900 text-white px-2 py-0.5 text-[10px] font-black">
                1 tour
              </span>
                        </div>
                        <div className="mt-1 text-[12px] text-slate-600">
                            Résultat tiré côté serveur, appliqué automatiquement.
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={spin}
                        disabled={!canSpin}
                        className={cx(
                            "shrink-0 rounded-2xl px-4 py-3 text-[14px] font-black transition-all focus:outline-none focus:ring-2 focus:ring-rose-200",
                            canSpin ? "bg-slate-900 text-white hover:opacity-95 active:scale-[0.99]" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        {spinning ? (
                            <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin"/>
                Go…
              </span>
                        ) : props.hasSpun ? (
                            "Déjà joué"
                        ) : (
                            <span className="inline-flex items-center gap-2">
                <Sparkles className="h-5 w-5"/>
                Tourner
              </span>
                        )}
                    </button>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-2 gap-2 text-[12px] font-black text-slate-700">
                        {labels.map((t, i) => (
                            <div key={i} className="rounded-2xl bg-white ring-1 ring-slate-200 px-3 py-2">
                                {t}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
