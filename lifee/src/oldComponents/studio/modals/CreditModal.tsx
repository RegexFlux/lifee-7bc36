// components/modals/CreditModal.tsx
"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import {
    CheckCircle2,
    ChevronRight,
    Crown,
    Gift,
    Loader2,
    ShieldCheck,
    Sparkles,
    Ticket,
    X,
    Zap,
    Percent,
} from "lucide-react";

import type {
    Tier,
    PackDTO,
    Promo,
    PacksResponse,
    ValidatePromoResponse,
    SpinPromoResponse
} from "@/types/billing";

/** ---------------- utils ---------------- */
function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function formatEUR(n: number) {
    return n.toFixed(2).replace(".", ",") + "€";
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

async function safeJson<T>(res: Response): Promise<T> {
    const txt = await res.text();
    try {
        return JSON.parse(txt) as T;
    } catch {
        throw new Error(txt || `HTTP ${res.status}`);
    }
}

function useLockBodyScroll(locked: boolean) {
    useEffect(() => {
        if (!locked) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [locked]);
}

function useEscape(close: () => void, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [close, enabled]);
}

/** ---------- Small “price pop” animation trigger ---------- */
function useBumpTrigger(dep: string | number) {
    const [bump, setBump] = useState(false);
    useEffect(() => {
        setBump(true);
        const t = window.setTimeout(() => setBump(false), 650);
        return () => window.clearTimeout(t);
    }, [dep]);
    return bump;
}

/** ---------------- promo helpers (UI only) ---------------- */
function promoPill(r: Promo["rarity"]) {
    switch (r) {
        case "common":
            return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
        case "uncommon":
            return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
        case "rare":
            return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
        case "jackpot":
            return "bg-rose-50 text-rose-800 ring-1 ring-rose-200";
    }
}

function baseCredits(pack: PackDTO) {
    return pack.credits + (pack.includedExtraCredits ?? 0);
}

function effectiveCredits(pack: PackDTO, promo: Promo | null) {
    const base = baseCredits(pack);
    if (!promo) return base;
    if (promo.effect.kind === "credits") return base + promo.effect.extraCredits;
    return base;
}

function discountedPrice(pack: PackDTO, promo: Promo | null) {
    const base = pack.priceEur;
    if (!promo) return base;
    if (promo.effect.kind === "percent") return clamp(base * (1 - promo.effect.percent / 100), 0, base);
    return base;
}

function savingsText(pack: PackDTO, promo: Promo | null) {
    if (!promo) return null;
    if (promo.effect.kind === "percent") {
        const saved = pack.priceEur - discountedPrice(pack, promo);
        return saved > 0.009 ? `Économie ${formatEUR(saved)}` : null;
    }
    if (promo.effect.kind === "credits") return `+${promo.effect.extraCredits} crédits`;
    return null;
}

/** ---------------- Roulette (server result) ---------------- */
export type ReelItem = {
    label: string;
    code: string;
    rarity: Promo["rarity"];
};

export function randomTeaser(): ReelItem {
    const teasers: ReelItem[] = [
        {label: "-5% immédiat", code: "—", rarity: "common"},
        {label: "-10% (nice)", code: "—", rarity: "uncommon"},
        {label: "-15% (gros win)", code: "—", rarity: "rare"},
        {label: "-20% (flash)", code: "—", rarity: "rare"},
        {label: "-25% (jackpot)", code: "—", rarity: "jackpot"},
        {label: "+10 crédits offerts", code: "—", rarity: "uncommon"},
        {label: "+20 crédits offerts", code: "—", rarity: "jackpot"},
    ];
    return teasers[Math.floor(Math.random() * teasers.length)]!;
}

function PromoRoulette(props: {
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

    const canSpin = !props.disabled && !props.hasSpun && !spinning && !!props.packId;

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
                            Roulette promo
                            <span
                                className="ml-1 rounded-full bg-slate-900 text-white px-2 py-0.5 text-[10px] font-black">
                1 tour offert
              </span>
                        </div>
                        <div className="mt-1 text-[12px] text-slate-600">Tirage serveur → appliqué automatiquement.
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

                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="relative" style={{height: 3 * 44}}>
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
                                <div key={`${p.label}-${idx}`}
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

/** ---------------- Main modal ---------------- */
export function CreditModal(props: {
    open: boolean;
    credits: number;
    purchasing: boolean;
    onClose: () => void;

    /** optionnel mais utile pour recommendedPackId côté back */
    draftId?: string | null;

    onPurchase: (
        amount: number,
        opts?: {
            packId: string;
            tier: Tier;
            promoCode?: string | null;
            promoSource?: "manual" | "roulette" | null;
        }
    ) => void;
}) {
    useLockBodyScroll(props.open);
    useEscape(props.onClose, props.open && !props.purchasing);

    const closeRef = useRef<HTMLButtonElement | null>(null);

    const [tier, setTier] = useState<Tier>("creator");
    const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

    // packs from back
    const [packs, setPacks] = useState<PackDTO[]>([]);
    const [packsLoading, setPacksLoading] = useState(false);

    // promo
    const [promoInput, setPromoInput] = useState("");
    const [appliedPromo, setAppliedPromo] = useState<Promo | null>(null);
    const [promoSource, setPromoSource] = useState<"manual" | "roulette" | null>(null);

    // roulette: 1 spin per open
    const [hasSpun, setHasSpun] = useState(false);

    // small UX messages
    const [toast, setToast] = useState<string | null>(null);

    const hasStandard = useMemo(() => packs.some((p) => p.tier === "standard"), [packs]);
    const hasCreator = useMemo(() => packs.some((p) => p.tier === "creator"), [packs]);

    const visiblePacks = useMemo(() => packs.filter((p) => p.tier === tier), [packs, tier]);

    const selectedPack = useMemo(() => {
        const found = selectedPackId ? packs.find((p) => p.id === selectedPackId) : null;
        if (found && found.tier === tier) return found;

        // fallback: pick best in this tier
        const inTier = packs.filter((p) => p.tier === tier);
        if (inTier.length) return inTier.find((p) => p.highlight) ?? inTier[0]!;
        // fallback any
        return packs[0] ?? null;
    }, [packs, selectedPackId, tier]);

    // keep selection valid
    useEffect(() => {
        if (!selectedPack) return;
        if (selectedPackId !== selectedPack.id) setSelectedPackId(selectedPack.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tier, packs]);

    // pricing (UI)
    const finalPrice = selectedPack ? discountedPrice(selectedPack, appliedPromo) : 0;
    const finalCredits = selectedPack ? effectiveCredits(selectedPack, appliedPromo) : 0;
    const priceBump = useBumpTrigger(finalPrice);
    const creditsBump = useBumpTrigger(finalCredits);

    const loadPacks = async () => {
        setPacksLoading(true);
        try {
            const qs = props.draftId ? `?draftId=${encodeURIComponent(props.draftId)}` : "";
            const r = await fetch(`/api/album/packs${qs}`, {credentials: "include"});
            if (!r.ok) throw new Error(await r.text());
            const data = await safeJson<PacksResponse>(r);

            setPacks(data.packs);

            // choose tier default + selected pack
            const preferTier: Tier = data.packs.some((p) => p.tier === "creator") ? "creator" : "standard";
            setTier(preferTier);

            const rec = data.recommendedPackId;
            const pick =
                (rec && data.packs.find((p) => p.id === rec)) ||
                data.packs.find((p) => p.tier === preferTier && p.highlight) ||
                data.packs.find((p) => p.tier === preferTier) ||
                data.packs[0] ||
                null;

            setSelectedPackId(pick?.id ?? null);
        } catch {
            setPacks([]);
            setSelectedPackId(null);
        } finally {
            setPacksLoading(false);
        }
    };

    useEffect(() => {
        if (!props.open) return;

        window.setTimeout(() => closeRef.current?.focus(), 0);

        // reset roulette each open
        setHasSpun(false);

        // reset promo each open (conversion-friendly)
        setAppliedPromo(null);
        setPromoSource(null);
        setPromoInput("");

        void loadPacks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.open]);

    // toast lifecycle
    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(null), 1400);
        return () => window.clearTimeout(t);
    }, [toast]);

    async function applyPromo(code: string, source: "manual" | "roulette") {
        const raw = code.trim().toUpperCase();
        if (!raw) return;

        if (!selectedPack) {
            setToast("Choisis un pack d’abord.");
            return;
        }

        if (source === "manual") {
            try {
                const r = await fetch("/api/album/promo/validate", {
                    method: "POST",
                    credentials: "include",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({code: raw, packId: selectedPack.id, tier}),
                });

                const data = await safeJson<ValidatePromoResponse>(r);
                if (!data.ok || !data.quote?.promo) throw new Error(data.ok ? "Code invalide" : data.error);

                setAppliedPromo(data.quote.promo);
                setPromoSource("manual");
                setPromoInput(data.quote.promo.code);
                setToast("Code promo appliqué ✅");
            } catch {
                setToast("Code invalide");
            }
            return;
        }

        // roulette: promo already validated on server by /spin
        // this path is applied via onResult(promo) -> call below
    }

    function applyPromoFromRoulette(promo: Promo) {
        setAppliedPromo(promo);
        setPromoSource("roulette");
        setPromoInput(promo.code);
        setToast("Promo appliquée 🎉");
    }

    function clearPromo() {
        setAppliedPromo(null);
        setPromoSource(null);
        setPromoInput("");
        setToast("Promo retirée");
    }

    if (!props.open) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="credit-modal-title"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !props.purchasing) props.onClose();
            }}
        >
            <div
                className="bottom-0 absolute w-screen md:relative md:rounded-b-4xl rounded-t-4xl h-[90dvh] bg-white shadow-2xl overflow-scroll"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div
                    className="px-6 py-5 text-white"
                    style={{
                        background:
                            "radial-gradient(1200px 280px at 10% 0%, rgba(244,63,94,0.65), transparent 58%), radial-gradient(1200px 280px at 90% 100%, rgba(245,158,11,0.65), transparent 58%), linear-gradient(90deg, #0f172a, #111827)",
                    }}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2">
                                <div
                                    className="h-10 w-10 rounded-2xl bg-white/12 ring-1 ring-white/15 grid place-items-center">
                                    <Sparkles className="h-5 w-5"/>
                                </div>
                                <div>
                                    <h3 id="credit-modal-title"
                                        className="text-[20px] md:text-[22px] font-black tracking-tight">
                                        Recharge rapide
                                    </h3>
                                    <div className="mt-1 text-[12px] text-white/80">
                                        Solde :{" "}
                                        <span
                                            className="ml-1 inline-flex items-center rounded-xl bg-white/12 px-2 py-0.5 font-black">
                      {props.credits}
                    </span>
                                        <span className="ml-3 hidden md:inline text-white/65">
                      Tire la roulette pour débloquer des bonus
                    </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            ref={closeRef}
                            onClick={() => !props.purchasing && props.onClose()}
                            className="rounded-full bg-white/12 hover:bg-white/18 p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
                            aria-label="Fermer"
                        >
                            <X size={18}/>
                        </button>
                    </div>

                    {/* quick tier switch */}
                    <div className="mt-4 inline-flex rounded-2xl bg-white/10 p-1 ring-1 ring-white/10">
                        <button
                            type="button"
                            onClick={() => setTier("standard")}
                            disabled={props.purchasing || !hasStandard}
                            className={cx(
                                "rounded-2xl px-4 py-2 text-xs font-black transition-colors",
                                tier === "standard" ? "bg-white text-slate-900" : "text-white/80 hover:text-white",
                                !hasStandard && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            Standard · 720p
                        </button>
                        <button
                            type="button"
                            onClick={() => setTier("creator")}
                            disabled={props.purchasing || !hasCreator}
                            className={cx(
                                "rounded-2xl px-4 py-2 text-xs font-black transition-colors inline-flex items-center gap-2",
                                tier === "creator" ? "bg-white text-slate-900" : "text-white/80 hover:text-white",
                                !hasCreator && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <Crown className="h-4 w-4 text-rose-600"/>
                            Créateur · 1080p+
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="bg-slate-50">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 p-4 md:p-5">
                        {/* LEFT */}
                        <div className="space-y-4">
                            {/* PACKS */}
                            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="px-5 py-4 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-[15px] font-black text-slate-900">Choisis ton pack</div>
                                        <div className="mt-1 text-[12px] text-slate-600">
                                            {tier === "creator"
                                                ? "1080p, plus rapide, support avancé, musique illimitée."
                                                : "720p standard — simple et efficace."}
                                        </div>
                                    </div>

                                    <span
                                        className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-200">
                    <Zap className="h-4 w-4"/>
                    Paiement en 1 clic
                  </span>
                                </div>

                                {packsLoading ? (
                                    <div className="px-5 pb-5 text-sm text-slate-600 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                        Chargement des packs…
                                    </div>
                                ) : visiblePacks.length === 0 ? (
                                    <div className="px-5 pb-5 text-sm text-slate-600">Aucun pack disponible.</div>
                                ) : (
                                    <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {visiblePacks.map((p) => {
                                            const selected = p.id === selectedPackId;

                                            const base = p.priceEur;
                                            const withPromo = discountedPrice(p, appliedPromo);
                                            const hasDiscount = withPromo < base - 0.005;

                                            const credits = effectiveCredits(p, appliedPromo);
                                            const creditBase = baseCredits(p);

                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setSelectedPackId(p.id)}
                                                    disabled={props.purchasing}
                                                    className={cx(
                                                        "relative text-left rounded-3xl p-4 border transition-all overflow-hidden",
                                                        selected ? "border-slate-900 shadow-md" : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
                                                        p.highlight && !selected && "ring-1 ring-amber-200"
                                                    )}
                                                >
                                                    <div
                                                        className="absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-70"
                                                        style={{
                                                            background:
                                                                p.tier === "creator"
                                                                    ? "radial-gradient(circle, rgba(244,63,94,0.55), transparent 60%)"
                                                                    : "radial-gradient(circle, rgba(245,158,11,0.55), transparent 60%)",
                                                        }}
                                                        aria-hidden="true"
                                                    />

                                                    {p.badge ? (
                                                        <div className="absolute top-3 right-3">
                              <span
                                  className={cx(
                                      "rounded-full px-2 py-1 text-[10px] font-black",
                                      selected
                                          ? "bg-slate-900 text-white"
                                          : p.highlight
                                              ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                                              : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                                  )}
                              >
                                {p.badge}
                              </span>
                                                        </div>
                                                    ) : null}

                                                    <div className="relative">
                                                        <div
                                                            className="text-[14px] font-black text-slate-900">{p.name}</div>
                                                        <div
                                                            className="mt-0.5 text-[12px] font-semibold text-slate-500">{p.subtitle}</div>

                                                        <div className="mt-3 flex items-end justify-between gap-3">
                                                            <div>
                                                                <div
                                                                    className="text-[28px] leading-none font-black text-slate-900">
                                                                    {credits}
                                                                    <span
                                                                        className="ml-1 text-[12px] font-black text-slate-500">crédits</span>
                                                                </div>

                                                                {credits > creditBase ? (
                                                                    <div
                                                                        className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800 ring-1 ring-emerald-200">
                                                                        +{credits - creditBase} via promo
                                                                    </div>
                                                                ) : p.includedExtraCredits ? (
                                                                    <div
                                                                        className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800 ring-1 ring-emerald-200">
                                                                        +{p.includedExtraCredits} offerts
                                                                    </div>
                                                                ) : null}
                                                            </div>

                                                            <div className="text-right">
                                                                {hasDiscount ? (
                                                                    <div
                                                                        className="text-[12px] font-black text-slate-400 line-through">{formatEUR(base)}</div>
                                                                ) : null}
                                                                <div
                                                                    className={cx("text-[22px] font-black text-slate-900", selected && "drop-shadow-sm")}>
                                                                    {formatEUR(withPromo)}
                                                                </div>
                                                                {hasDiscount ? (
                                                                    <div
                                                                        className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-800 ring-1 ring-rose-200">
                                                                        <Percent className="h-3.5 w-3.5"/>
                                                                        {savingsText(p, appliedPromo)}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 space-y-1">
                                                            {p.benefits.slice(0, 3).map((b, i) => (
                                                                <div key={i}
                                                                     className="text-[12px] text-slate-600 flex items-center gap-2">
                                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600"/>
                                                                    <span className="truncate">{b}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="mt-3 flex items-center justify-between">
                              <span
                                  className={cx("text-[12px] font-black", selected ? "text-slate-900" : "text-slate-500")}>
                                {selected ? "Sélectionné" : "Choisir"}
                              </span>
                                                            <ChevronRight
                                                                className={cx("h-5 w-5", selected ? "text-slate-900" : "text-slate-400")}/>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* PROMO + ROULETTE */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Promo code */}
                                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                    <div className="px-5 py-4">
                                        <div className="text-[15px] font-black text-slate-900">Réduction</div>
                                        <div className="mt-1 text-[12px] text-slate-600">
                                            Entre un code promo <span className="font-black">ou</span> tourne la
                                            roulette (1 fois).
                                        </div>

                                        {appliedPromo ? (
                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-3 py-2 text-[12px] font-black">
                          <Gift className="h-4 w-4"/>
                            {appliedPromo.code}
                            <span
                                className={cx("rounded-full px-2 py-0.5 text-[10px] font-black", promoPill(appliedPromo.rarity))}>
                            {promoSource === "roulette" ? "ROULETTE" : "CODE"}
                          </span>
                        </span>

                                                <span
                                                    className="inline-flex items-center rounded-2xl bg-emerald-50 px-3 py-2 text-[12px] font-black text-emerald-800 ring-1 ring-emerald-200">
                          {selectedPack ? savingsText(selectedPack, appliedPromo) ?? "Avantage appliqué" : "Avantage appliqué"}
                        </span>

                                                <button
                                                    type="button"
                                                    onClick={clearPromo}
                                                    disabled={props.purchasing}
                                                    className="inline-flex items-center rounded-2xl bg-slate-100 px-3 py-2 text-[12px] font-black text-slate-700 hover:bg-slate-200"
                                                >
                                                    Retirer
                                                </button>
                                            </div>
                                        ) : null}

                                        <div className="mt-3 flex flex-col md:flex-row gap-2">
                                            <div className="relative flex-1">
                                                <Gift
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                                <input
                                                    value={promoInput}
                                                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                                                    placeholder="Code promo (ex: LUCKY10)"
                                                    className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-[14px] font-bold outline-none focus:ring-2 focus:ring-rose-200"
                                                    disabled={props.purchasing}
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                disabled={props.purchasing || promoInput.trim().length < 4 || !selectedPack}
                                                onClick={() => applyPromo(promoInput, "manual")}
                                                className={cx(
                                                    "rounded-2xl px-4 py-3 text-[14px] font-black transition-all",
                                                    promoInput.trim().length >= 4 && !props.purchasing && !!selectedPack
                                                        ? "bg-slate-900 text-white hover:opacity-95 active:scale-[0.99]"
                                                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                )}
                                            >
                                                Appliquer
                                            </button>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {[
                                                {
                                                    label: "Jusqu’à -25%",
                                                    tone: "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                                                },
                                                {
                                                    label: "+20 crédits",
                                                    tone: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                                                },
                                                {
                                                    label: "Flash -20%",
                                                    tone: "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                                                },
                                                {
                                                    label: "Bonus surprise",
                                                    tone: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200"
                                                },
                                            ].map((x, i) => (
                                                <span key={i}
                                                      className={cx("rounded-full px-3 py-1 text-[11px] font-black", x.tone)}>
                          {x.label}
                        </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Roulette */}
                                <PromoRoulette
                                    tier={tier}
                                    packId={selectedPack?.id ?? null}
                                    disabled={props.purchasing || hasSpun || !selectedPack}
                                    hasSpun={hasSpun}
                                    onResult={(promo) => {
                                        setHasSpun(true);
                                        applyPromoFromRoulette(promo);
                                    }}
                                />
                            </div>
                        </div>

                        {/* RIGHT: total + sticky checkout */}
                        <div className="space-y-4">
                            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="px-5 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-[15px] font-black text-slate-900">Total</div>
                                            <div className="mt-1 text-[12px] text-slate-600">Prêt en 5 secondes →
                                                Stripe.
                                            </div>
                                        </div>
                                        <span
                                            className="inline-flex items-center gap-2 text-[11px] font-black text-slate-600">
                      <ShieldCheck className="h-4 w-4"/>
                      Sécurisé
                    </span>
                                    </div>

                                    <div
                                        className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4"
                                        style={{
                                            background:
                                                "radial-gradient(700px 180px at 10% 0%, rgba(245,158,11,0.14), transparent 55%), radial-gradient(700px 180px at 90% 100%, rgba(244,63,94,0.12), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.85))",
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-[12px] font-bold text-slate-500">Pack</div>
                                                <div className="mt-1 text-[15px] font-black text-slate-900">
                                                    {selectedPack ? `${selectedPack.name} · ${selectedPack.credits} crédits` : "—"}
                                                </div>

                                                <div className="mt-2 flex flex-wrap gap-2">
                          <span
                              className={cx(
                                  "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-black",
                                  creditsBump && "animate-[pop_650ms_ease-out] motion-reduce:animate-none",
                                  "bg-white/80 text-slate-900 ring-1 ring-slate-200"
                              )}
                          >
                            Total crédits : {selectedPack ? finalCredits : 0}
                          </span>

                                                    {appliedPromo ? (
                                                        <span
                                                            className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[12px] font-black text-slate-900 ring-1 ring-slate-200">
                              Code : {appliedPromo.code}
                            </span>
                                                    ) : (
                                                        <span
                                                            className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[12px] font-black text-slate-700 ring-1 ring-slate-200">
                              Aucun code
                            </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                {selectedPack && appliedPromo && finalPrice < selectedPack.priceEur - 0.005 ? (
                                                    <div className="text-[12px] font-black text-slate-400 line-through">
                                                        {formatEUR(selectedPack.priceEur)}
                                                    </div>
                                                ) : null}

                                                <div
                                                    className={cx(
                                                        "text-[34px] leading-none font-black text-slate-900",
                                                        priceBump && "animate-[pop_650ms_ease-out] motion-reduce:animate-none"
                                                    )}
                                                    aria-live="polite"
                                                >
                                                    {formatEUR(selectedPack ? finalPrice : 0)}
                                                </div>

                                                {appliedPromo && selectedPack ? (
                                                    <div
                                                        className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-200">
                                                        <CheckCircle2 className="h-4 w-4"/>
                                                        {savingsText(selectedPack, appliedPromo) ?? "Avantage appliqué"}
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-800 ring-1 ring-amber-200">
                                                        <Sparkles className="h-4 w-4"/>
                                                        Astuce : tourne la roulette 🙂
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={props.purchasing || !selectedPack}
                                        onClick={() => {
                                            if (!selectedPack) return;
                                            props.onPurchase(selectedPack.credits, {
                                                packId: selectedPack.id,
                                                tier: selectedPack.tier,
                                                promoCode: appliedPromo ? appliedPromo.code : null,
                                                promoSource: promoSource,
                                            });
                                        }}
                                        className={cx(
                                            "mt-4 w-full rounded-3xl px-4 py-4 text-[16px] font-black transition-all",
                                            "focus:outline-none focus:ring-2 focus:ring-rose-200",
                                            props.purchasing || !selectedPack
                                                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                                : "bg-slate-900 text-white hover:opacity-95 active:scale-[0.99]"
                                        )}
                                    >
                                        {props.purchasing ? (
                                            <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin"/>
                        Redirection…
                      </span>
                                        ) : (
                                            "Acheter maintenant"
                                        )}
                                    </button>

                                    <div
                                        className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                                        <ShieldCheck size={12}/> Paiement sécurisé (Stripe / SSL)
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
                                <div className="text-[12px] font-black text-slate-900">Pourquoi ça vaut le coup</div>
                                <div className="mt-2 grid grid-cols-1 gap-2">
                                    {[
                                        "Qualité + stable (et 1080p en Créateur)",
                                        "Gagne du temps avec la priorité rendu",
                                        "Musique illimitée + support avancé (Créateur)",
                                    ].map((t, i) => (
                                        <div key={i} className="flex items-start gap-2 text-[12px] text-slate-600">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5"/>
                                            <span>{t}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* toast */}
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                    {toast ? (
                        <div
                            className="pointer-events-none rounded-full bg-slate-900 text-white px-4 py-2 text-[12px] font-black shadow-lg">
                            {toast}
                        </div>
                    ) : null}
                </div>

                {/* overlay purchasing */}
                {props.purchasing && (
                    <div
                        className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center">
                        <div className="rounded-3xl bg-white px-6 py-5 shadow-xl ring-1 ring-slate-200 text-center">
                            <Loader2 className="h-10 w-10 animate-spin mx-auto text-slate-900"/>
                            <div className="mt-3 text-[15px] font-black text-slate-900">On s’occupe de tout…</div>
                            <div className="mt-1 text-[12px] text-slate-500">Redirection vers Stripe.</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
