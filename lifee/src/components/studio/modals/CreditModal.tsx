//components/modals/creditModal.tsx
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

type Tier = "standard" | "creator";

type PromoEffect =
    | { kind: "percent"; percent: number }
    | { kind: "credits"; extraCredits: number }
    | { kind: "unknown" };

type Promo = {
    code: string;
    label: string;
    rarity: "common" | "uncommon" | "rare" | "jackpot";
    effect: PromoEffect;
};

type Pack = {
    id: string;
    tier: Tier;
    name: string;
    subtitle: string;
    credits: number;
    priceEur: number;
    includedExtraCredits?: number;
    badge?: string;
    highlight?: boolean;
    benefits: string[];
};

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function formatEUR(n: number) {
    // fr friendly
    return n.toFixed(2).replace(".", ",") + "€";
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

/** ---------- Business constraints ---------- */
const COST_PER_GEN = 0.35;
const MIN_CREDITS_PER_PURCHASE = 20;

/** Packs: lumineux, simples, “sale ready” */
const PACKS: Pack[] = [
    {
        id: "std_20",
        tier: "standard",
        name: "Starter",
        subtitle: "Pour tester",
        credits: 20,
        priceEur: 15,
        badge: "Simple",
        benefits: ["720p", "Rendu stable", "Musique (sélection)"],
    },
    {
        id: "std_50",
        tier: "standard",
        name: "Plus",
        subtitle: "Meilleure valeur",
        credits: 50,
        priceEur: 32,
        badge: "⭐ Value",
        highlight: true,
        benefits: ["720p", "Support standard", "Musique (sélection)"],
    },
    {
        id: "cr_40",
        tier: "creator",
        name: "Créateur",
        subtitle: "1080p + plus rapide",
        credits: 40,
        priceEur: 29,
        includedExtraCredits: 5,
        badge: "Populaire",
        benefits: ["1080p", "Service plus rapide", "Support avancé", "Musique illimitée", "Rendu amélioré", "+5 crédits offerts"],
    },
    {
        id: "cr_80",
        tier: "creator",
        name: "Studio Pro",
        subtitle: "Priorité + gros bonus",
        credits: 80,
        priceEur: 49,
        includedExtraCredits: 10,
        badge: "🔥 Best",
        highlight: true,
        benefits: ["1080p", "Priorité rendu", "Support avancé", "Musique illimitée", "Rendu amélioré", "+10 crédits offerts"],
    },
];

/** Promo catalog (roulette + code manuel). Roulette => toujours un code de cette liste. */
const PROMOS: Promo[] = [
    {code: "LUCKY5", label: "-5% immédiat", rarity: "common", effect: {kind: "percent", percent: 5}},
    {code: "LUCKY10", label: "-10% (nice)", rarity: "uncommon", effect: {kind: "percent", percent: 5}},
    {code: "LUCKY15", label: "-15% (gros win)", rarity: "rare", effect: {kind: "percent", percent: 5}},
    {code: "FLASH20", label: "-20% (flash)", rarity: "rare", effect: {kind: "percent", percent: 15}},
    {code: "JACKPOT25", label: "-25% (jackpot)", rarity: "jackpot", effect: {kind: "percent", percent: 25}},
    {code: "JACKPOT20", label: "-25% (jackpot)", rarity: "jackpot", effect: {kind: "percent", percent: 20}},
    {code: "BONUS10", label: "+10 crédits offerts", rarity: "uncommon", effect: {kind: "credits", extraCredits: 10}},
    {code: "BONUS20", label: "+20 crédits offerts", rarity: "jackpot", effect: {kind: "credits", extraCredits: 20}},
];

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

function promoWeight(p: Promo) {
    // casino-ish, mais pas “trop”. Bonus: tiers creator => odds un peu meilleures.
    switch (p.rarity) {
        case "common":
            return 55;
        case "uncommon":
            return 26;
        case "rare":
            return 14;
        case "jackpot":
            return 5;
    }
}

function pickWeightedPromo(promos: Promo[], tier: Tier) {
    // Creator: petit boost sur rare/jackpot
    const weighted = promos.map((p) => {
        const base = promoWeight(p);
        const boost = tier === "creator" ? (p.rarity === "rare" ? 4 : p.rarity === "jackpot" ? 2 : 0) : 0;
        return {p, w: base + boost};
    });

    const total = weighted.reduce((a, b) => a + b.w, 0);
    const r = Math.random() * total;
    let acc = 0;
    for (const it of weighted) {
        acc += it.w;
        if (r <= acc) return it.p;
    }
    return weighted[weighted.length - 1]!.p;
}

function resolvePromo(codeRaw: string): Promo | null {
    const code = codeRaw.trim().toUpperCase();
    if (!code) return null;
    return PROMOS.find((p) => p.code === code) ?? null;
}

function effectiveCredits(pack: Pack, promo: Promo | null) {
    const base = pack.credits + (pack.includedExtraCredits ?? 0);
    if (!promo) return base;
    if (promo.effect.kind === "credits") return base + promo.effect.extraCredits;
    return base;
}

function discountedPrice(pack: Pack, promo: Promo | null) {
    const base = pack.priceEur;
    if (!promo) return base;
    if (promo.effect.kind === "percent") return clamp(base * (1 - promo.effect.percent / 100), 0, base);
    return base;
}

function savingsText(pack: Pack, promo: Promo | null) {
    if (!promo) return null;
    if (promo.effect.kind === "percent") {
        const saved = pack.priceEur - discountedPrice(pack, promo);
        return saved > 0.009 ? `Économie ${formatEUR(saved)}` : null;
    }
    if (promo.effect.kind === "credits") return `+${promo.effect.extraCredits} crédits`;
    return null;
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

/** ---------- Roulette (super simple, flashy, 1 spin max per open) ---------- */
function PromoRoulette(props: {
    tier: Tier;
    disabled: boolean;
    hasSpun: boolean;
    onResult: (promo: Promo) => void;
}) {
    const ITEM_H = 44;
    const VISIBLE = 3;
    const centerIndex = 1;

    const [spinning, setSpinning] = useState(false);
    const [reel, setReel] = useState<Promo[]>(() => PROMOS);
    const [y, setY] = useState(0);

    const canSpin = !props.disabled && !props.hasSpun && !spinning;

    const prefersReducedMotion = useMemo(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    }, []);

    function spin() {
        if (!canSpin) return;

        const result = pickWeightedPromo(PROMOS, props.tier);

        // build reel: random sequence + result near the end so it “lands”
        const seq: Promo[] = [];
        for (let i = 0; i < 18; i++) {
            seq.push(PROMOS[Math.floor(Math.random() * PROMOS.length)]!);
        }
        // put result at index 18, keep 1 item after
        seq.push(result);
        seq.push(PROMOS[Math.floor(Math.random() * PROMOS.length)]!);

        setReel(seq);
        setSpinning(true);

        // reset position
        setY(0);

        const resultIndex = 18; // where we placed it
        const targetY = -((resultIndex - centerIndex) * ITEM_H);

        // allow layout, then animate
        window.setTimeout(() => {
            setY(targetY);
        }, 30);

        window.setTimeout(() => {
            setSpinning(false);
            props.onResult(result);
        }, prefersReducedMotion ? 120 : 1650);
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

/** ---------- Main modal ---------- */
export function CreditModal(props: {
    open: boolean;
    credits: number;
    purchasing: boolean;
    onClose: () => void;

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
    const [selectedPackId, setSelectedPackId] = useState<string>("cr_80");

    // promo
    const [promoInput, setPromoInput] = useState("");
    const [appliedPromo, setAppliedPromo] = useState<Promo | null>(null);
    const [promoSource, setPromoSource] = useState<"manual" | "roulette" | null>(null);

    // roulette: always 1 spin per open
    const [hasSpun, setHasSpun] = useState(false);

    // small UX messages
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (!props.open) return;
        window.setTimeout(() => closeRef.current?.focus(), 0);

        // reset roulette each open for “1 tour offert”
        setHasSpun(false);

        // keep promo if you want; but conversion-wise it’s better to reset:
        setAppliedPromo(null);
        setPromoSource(null);
        setPromoInput("");

        // default: creator / best value selected
        setTier("creator");
        setSelectedPackId("cr_80");
    }, [props.open]);

    const packs = useMemo(() => PACKS.filter((p) => p.credits >= MIN_CREDITS_PER_PURCHASE), []);
    const visiblePacks = useMemo(() => packs.filter((p) => p.tier === tier), [packs, tier]);

    const selectedPack = useMemo(() => {
        const p = packs.find((x) => x.id === selectedPackId);
        // If tier changed and selectedPack mismatched, auto pick first of tier
        if (p && p.tier === tier) return p;
        const fallback = packs.find((x) => x.tier === tier) ?? packs[0]!;
        return fallback;
    }, [packs, selectedPackId, tier]);

    // ensure selection stays valid
    useEffect(() => {
        if (selectedPack && selectedPack.id !== selectedPackId) setSelectedPackId(selectedPack.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tier]);

    const finalPrice = discountedPrice(selectedPack, appliedPromo);
    const finalCredits = effectiveCredits(selectedPack, appliedPromo);
    const baseCredits = selectedPack.credits + (selectedPack.includedExtraCredits ?? 0);

    const priceBump = useBumpTrigger(finalPrice);
    const creditsBump = useBumpTrigger(finalCredits);

    function applyPromo(code: string, source: "manual" | "roulette") {
        const found = resolvePromo(code);
        if (!found) {
            setToast("Code inconnu — on vérifiera au checkout.");
            // keep the raw code so you can still pass it to Stripe if you want,
            // but here we keep it simple: don't apply unknown.
            return;
        }
        setAppliedPromo(found);
        setPromoSource(source);
        setPromoInput(found.code);
        setToast(source === "roulette" ? "Promo appliquée 🎉" : "Code promo appliqué ✅");
    }

    function clearPromo() {
        setAppliedPromo(null);
        setPromoSource(null);
        setPromoInput("");
        setToast("Promo retirée");
    }

    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(null), 1400);
        return () => window.clearTimeout(t);
    }, [toast]);

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
                {/* HEADER (bright, dynamic) */}
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
                                        <span className="ml-3 hidden md:inline text-white/65">Tire la roulette pour débloquer des bonus</span>
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
                            disabled={props.purchasing}
                            className={cx(
                                "rounded-2xl px-4 py-2 text-xs font-black transition-colors",
                                tier === "standard" ? "bg-white text-slate-900" : "text-white/80 hover:text-white"
                            )}
                        >
                            Standard · 720p
                        </button>
                        <button
                            type="button"
                            onClick={() => setTier("creator")}
                            disabled={props.purchasing}
                            className={cx(
                                "rounded-2xl px-4 py-2 text-xs font-black transition-colors inline-flex items-center gap-2",
                                tier === "creator" ? "bg-white text-slate-900" : "text-white/80 hover:text-white"
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
                        {/* LEFT: packs + promo input */}
                        <div className="space-y-4">
                            {/* PACKS (big CTA cards, lots of value cues) */}
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

                                <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {visiblePacks.map((p) => {
                                        const selected = p.id === selectedPackId;

                                        const base = p.priceEur;
                                        const withPromo = discountedPrice(p, appliedPromo);
                                        const hasDiscount = withPromo < base - 0.005;

                                        const credits = effectiveCredits(p, appliedPromo);
                                        const creditBase = p.credits + (p.includedExtraCredits ?? 0);

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
                                                {/* colorful corner */}
                                                <div
                                                    className="absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-70"
                                                    style={{
                                                        background: p.tier === "creator"
                                                            ? "radial-gradient(circle, rgba(244,63,94,0.55), transparent 60%)"
                                                            : "radial-gradient(circle, rgba(245,158,11,0.55), transparent 60%)",
                                                    }}
                                                    aria-hidden="true"
                                                />

                                                {/* badge */}
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
                                                        {/* credits */}
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

                                                        {/* price */}
                                                        <div className="text-right">
                                                            {hasDiscount ? (
                                                                <div
                                                                    className="text-[12px] font-black text-slate-400 line-through">
                                                                    {formatEUR(base)}
                                                                </div>
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

                                                    {/* quick benefits */}
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
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* PROMO (simple: code OR roulette). Highlight savings immediately. */}
                                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                    <div className="px-5 py-4">
                                        <div className="text-[15px] font-black text-slate-900">Réduction</div>
                                        <div className="mt-1 text-[12px] text-slate-600">
                                            Tu peux entrer un code promo <span className="font-black">ou</span> tourner
                                            la roulette (1 fois).
                                        </div>

                                        {/* Applied */}
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
                        {savingsText(selectedPack, appliedPromo) ?? "Avantage appliqué"}
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

                                        {/* Input */}
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
                                                disabled={props.purchasing || promoInput.trim().length < 4}
                                                onClick={() => applyPromo(promoInput, "manual")}
                                                className={cx(
                                                    "rounded-2xl px-4 py-3 text-[14px] font-black transition-all",
                                                    promoInput.trim().length >= 4 && !props.purchasing
                                                        ? "bg-slate-900 text-white hover:opacity-95 active:scale-[0.99]"
                                                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                )}
                                            >
                                                Appliquer
                                            </button>
                                        </div>

                                        {/* “lots of discounts” hint */}
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
                                <PromoRoulette
                                    tier={tier}
                                    disabled={props.purchasing || hasSpun}
                                    hasSpun={hasSpun}
                                    onResult={(promo) => {
                                        setHasSpun(true);
                                        applyPromo(promo.code, "roulette"); // ✅ roulette result => applied as promo code
                                    }}
                                />
                            </div>
                        </div>

                        {/* RIGHT: roulette + sticky checkout */}
                        <div className="space-y-4">
                            {/* Fast checkout (sticky-ish inside column) */}
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
                                                    {selectedPack.name} · {selectedPack.credits} crédits
                                                </div>

                                                <div className="mt-2 flex flex-wrap gap-2">
                          <span
                              className={cx(
                                  "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-black",
                                  creditsBump && "animate-[pop_650ms_ease-out] motion-reduce:animate-none",
                                  "bg-white/80 text-slate-900 ring-1 ring-slate-200"
                              )}
                          >
                            Total crédits : {finalCredits}
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
                                                {appliedPromo && finalPrice < selectedPack.priceEur - 0.005 ? (
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
                                                    {formatEUR(finalPrice)}
                                                </div>

                                                {appliedPromo ? (
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
                                        disabled={props.purchasing}
                                        onClick={() => {
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
                                            props.purchasing
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

                            {/* micro social proof */}
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
