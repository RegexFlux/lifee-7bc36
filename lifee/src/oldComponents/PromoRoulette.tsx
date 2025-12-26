import {Promo, SpinPromoResponse, Tier} from "@/types/billing";
import {useEffect, useMemo, useRef, useState} from "react";
import {resolvePromo} from "@/lib/album/promos.server";
import {promoPill, safeJson} from "@/components/album/AlbumSimple";
import {Loader2, Sparkles, Ticket} from "lucide-react";
import {cx} from "@/components/effects/StudioOpening";
import {randomTeaser, ReelItem} from "@/components/studio/modals/CreditModal";

export default function PromoRoulette(props: {
    tier: Tier;
    packId: string | null;
    disabled: boolean;
    hasSpun: boolean;
    onResult: (promo: Promo) => void;
}) {
    const ITEM_H = 44;
    const VISIBLE = 3;
    const centerIndex = 1;

    const [spinning, setSpinning] = useState(false);
    const [reel, setReel] = useState<ReelItem[]>(() => Array.from({length: 8}, () => randomTeaser()));
    const [y, setY] = useState(0);

    // const canSpin = !props.disabled && !props.hasSpun && !spinning && !!props.packId;
    const canSpin = !spinning;

    const prefersReducedMotion = useMemo(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    }, []);

    async function spin() {
        if (!canSpin || !props.packId) return;

        setSpinning(true);
        setY(0);

        // 1) Ask server for the real result (safe)
        let promo: Promo | null = null;
        try {
            const r = await fetch("/api/album/promo/spin", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({tier: props.tier, packId: props.packId}),
            });

            const data = await safeJson<SpinPromoResponse>(r);
            if (!data.ok || !data.quote?.promo) throw new Error(data.ok ? "Promo introuvable" : data.error);

            promo = data.quote.promo;
        } catch {
            // fail silently UX-wise; stop spin
            setSpinning(false);
            return;
        }

        // 2) Build reel with the real result near the end
        const seq: ReelItem[] = [];
        for (let i = 0; i < 18; i++) seq.push(randomTeaser());
        seq.push({label: promo.label, code: promo.code, rarity: promo.rarity});
        seq.push(randomTeaser());

        setReel(seq);

        const resultIndex = 18;
        const targetY = -((resultIndex - centerIndex) * ITEM_H);

        window.setTimeout(() => setY(targetY), 30);

        window.setTimeout(
            () => {
                setSpinning(false);
                props.onResult(promo!);
            },
            prefersReducedMotion ? 120 : 1650
        );
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
                            <span>Roulette promo</span>
                        </div>
                        <div className="mt-1 text-[12px] text-slate-600">
                            Tourne et on applique directement le code promo au paiement.
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={spin}
                        disabled={!canSpin}
                        className={cx(
                            "shrink-0 rounded-2xl px-4 py-3 text-[14px] font-black transition-all focus:outline-none focus:ring-2 focus:ring-rose-200",
                            canSpin
                                ? "bg-slate-900 text-white hover:opacity-95 active:scale-[0.99]"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        {spinning ? (
                            <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin"/>
                Go…
              </span>
                        ) : !canSpin ? (
                            "Déjà joué"
                        ) : (
                            <span className="inline-flex items-center gap-2">
                <Sparkles className="h-5 w-5"/>
                Tourner
              </span>
                        )}
                    </button>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="relative" style={{height: VISIBLE * ITEM_H}}>
                        <div
                            className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 h-[44px] rounded-2xl bg-white/80 ring-1 ring-slate-200 backdrop-blur"
                            aria-hidden="true"
                        />
                        <div
                            className="absolute left-0 right-0 top-0"
                            style={{
                                transform: `translateY(${y}px)`,
                                transition: prefersReducedMotion
                                    ? undefined
                                    : spinning
                                        ? "transform 1.55s cubic-bezier(0.12, 0.95, 0.18, 1)"
                                        : "transform 280ms cubic-bezier(0.2, 0.9, 0.2, 1)",
                                willChange: "transform",
                            }}
                        >
                            {reel.map((p, idx) => (
                                <div key={`${p.code}-${idx}`}
                                     className="h-[44px] px-5 flex items-center justify-between">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-black text-slate-900">{p.label}</div>
                                        <div className="truncate text-[11px] text-slate-500">Code: {p.code}</div>
                                    </div>
                                    <span
                                        className={cx("ml-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black", promoPill(p.rarity))}>
                    {p.rarity.toUpperCase()}
                  </span>
                                </div>
                            ))}
                        </div>
                        <div
                            className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-slate-50 to-transparent"/>
                        <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50 to-transparent"/>
                    </div>
                </div>
            </div>
        </div>
    );
}
