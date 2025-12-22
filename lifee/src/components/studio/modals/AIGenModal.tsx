"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Film,
    Image as ImageIcon,
    Info,
    Loader2,
    Sparkles,
    Stars,
    Wand2,
    X,
} from "lucide-react";
import type { Asset } from "@/types/studio";

type HiddenPresetKey =
    | "cinema_slow"
    | "parallax_soft"
    | "light_warm"
    | "film_grain"
    | "stabilize"
    | "face_focus";

type HiddenPreset = {
    key: HiddenPresetKey;
    title: string;
    desc: string;
    tag: string;
    defaultOn?: boolean;
};

const PRESETS: HiddenPreset[] = [
    {
        key: "cinema_slow",
        title: "Mouvement ciné",
        desc: "Dolly-in lent + mouvement doux.",
        tag: "slow cinematic dolly-in, gentle motion",
        defaultOn: true,
    },
    {
        key: "parallax_soft",
        title: "Profondeur douce",
        desc: "Parallax subtil, sans artefacts.",
        tag: "soft parallax depth, subtle separation foreground/background",
        defaultOn: true,
    },
    {
        key: "light_warm",
        title: "Lumière dorée",
        desc: "Ambiance nostalgique chaleureuse.",
        tag: "warm golden light, nostalgic mood",
        defaultOn: true,
    },
    {
        key: "film_grain",
        title: "Grain cinéma",
        desc: "Texture film légère.",
        tag: "light film grain, cinematic texture",
        defaultOn: true,
    },
    {
        key: "stabilize",
        title: "Stabiliser",
        desc: "Réduit tremblements & wobble.",
        tag: "stabilize motion, reduce wobble artifacts",
        defaultOn: true,
    },
    {
        key: "face_focus",
        title: "Focus visage",
        desc: "Priorise le sujet principal.",
        tag: "prioritize face and main subject clarity",
        defaultOn: false,
    },
];

export type AIGenHiddenOptions = {
    restoreColor: boolean; // default false
    presets: HiddenPresetKey[];
    extraPrompt?: string;
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function suggestCreditPack(timelineCount: number) {
    const n = Math.max(0, timelineCount);
    if (n <= 6) return 30;
    if (n <= 14) return 30;
    if (n <= 24) return 20;
    if (n <= 40) return 10;
    return 5;
}

export function buildHiddenPrompt(opts: AIGenHiddenOptions) {
    const tags = PRESETS.filter((p) => opts.presets.includes(p.key)).map((p) => p.tag);

    const color = opts.restoreColor
        ? "restore natural colors, gentle colorization, preserve skin tones"
        : "keep original tones, do not colorize, avoid altering colors";

    const base = [
        "Create a 3-second cinematic animation from a single photo.",
        "Keep faces stable; avoid distortions, flicker, and warping.",
        "Keep realistic scene; do not add new objects.",
        "Subtle camera motion only; film-like.",
        color,
        ...tags,
    ].join(" | ");

    const extra = (opts.extraPrompt || "").trim();
    return extra ? `${base} | User direction: ${extra}` : base;
}

type LiveState = {
    step: "idle" | "rendering" | "done" | "error";
    progress: number; // 0..100
    previewUrl?: string | null; // optional
    resultPreviewUrl?: string | null; // optional
    lines?: string[];
    error?: string | null;
    quality?: {
        phase:
            | "idle"
            | "precheck"
            | "denoise"
            | "upscale"
            | "color"
            | "detail"
            | "motion"
            | "render"
            | "upload"
            | "done";
        score?: number; // 0..100
        notes?: string[];
    };
};

function phaseLabel(p: NonNullable<LiveState["quality"]>["phase"]) {
    switch (p) {
        case "precheck":
            return "Analyse";
        case "denoise":
            return "Nettoyage";
        case "upscale":
            return "Netteté";
        case "color":
            return "Couleurs";
        case "detail":
            return "Détails";
        case "motion":
            return "Mouvement";
        case "render":
            return "Rendu";
        case "upload":
            return "Finalisation";
        case "done":
            return "Terminé";
        default:
            return "Prêt";
    }
}

function SegButton(props: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={props.onClick}
            className={[
                "flex-1 rounded-full px-3 py-2 text-xs font-semibold transition",
                props.active
                    ? "bg-stone-900 text-white shadow"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50",
            ].join(" ")}
        >
            {props.label}
        </button>
    );
}

export function AIGenModal(props: {
    open: boolean;
    source: Asset | null;
    credits: number;
    timelineCount: number;

    // action
    onGenerate: (payload: { durationSec: 3; prompt: string; options: AIGenHiddenOptions }) => void;
    onClose: () => void;

    // optional recharge CTA
    onPurchaseCredits?: (amount: number) => void;

    // live (optional)
    live?: LiveState;
}) {
    const [panel, setPanel] = useState<0 | 1 | 2>(1); // mobile: 0 source, 1 generate, 2 live
    const [advancedOpen, setAdvancedOpen] = useState(false);

    // defaults invisibles
    const [selected, setSelected] = useState<HiddenPresetKey[]>(
        PRESETS.filter((p) => p.defaultOn).map((p) => p.key)
    );
    const [restoreColor, setRestoreColor] = useState(false); // ✅ default false
    const [extraPrompt, setExtraPrompt] = useState("");

    const promptRef = useRef<HTMLTextAreaElement | null>(null);
    const carouselRef = useRef<HTMLDivElement | null>(null);

    const live = props.live;
    const step = live?.step ?? "idle";
    const isRendering = step === "rendering";
    const isDone = step === "done";
    const isError = step === "error";
    const pct = clamp(live?.progress ?? 0, 0, 100);

    const qPhase = live?.quality?.phase ?? (isRendering ? "precheck" : isDone ? "done" : "idle");
    const qScore = typeof live?.quality?.score === "number" ? clamp(live.quality.score, 0, 100) : null;

    const suggestedPack = useMemo(
        () => suggestCreditPack(props.timelineCount),
        [props.timelineCount]
    );

    const hiddenOptions: AIGenHiddenOptions = useMemo(
        () => ({
            restoreColor,
            presets: selected,
            extraPrompt: advancedOpen ? extraPrompt : "",
        }),
        [restoreColor, selected, extraPrompt, advancedOpen]
    );

    const hiddenPrompt = useMemo(() => buildHiddenPrompt(hiddenOptions), [hiddenOptions]);

    const canGenerate = !!props.source && props.credits > 0 && !isRendering;

    // Mobile: scroll to panel when changed
    useEffect(() => {
        if (!props.open) return;
        const el = carouselRef.current;
        if (!el) return;
        const w = el.clientWidth;
        el.scrollTo({ left: w * panel, behavior: "smooth" });
    }, [panel, props.open]);

    useEffect(() => {
        if (!props.open) return;
        if (!advancedOpen) return;
        const t = setTimeout(() => promptRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, [advancedOpen, props.open]);

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-[60]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
                onClick={() => {
                    if (isRendering) return;
                    props.onClose();
                }}
            />

            {/* Mobile-first bottom sheet container */}
            <div className="absolute inset-x-0 bottom-0 top-10 sm:top-8 flex items-end sm:items-center justify-center p-3 sm:p-6">
                <div className="relative w-full max-w-5xl h-[92vh] sm:h-auto sm:max-h-[86vh] rounded-[28px] border border-stone-200 bg-white shadow-2xl overflow-hidden">
                    {/* Ambient */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
                        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />
                        <div className="absolute inset-0 opacity-[0.10] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                    </div>

                    {/* Header */}
                    <div className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-stone-100 bg-white/75 backdrop-blur">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-stone-700 shadow-sm">
                                    <Sparkles size={12} className="text-rose-500" />
                                    Génération IA • 3s • Style film
                                </div>
                                <div className="mt-2 text-xl sm:text-2xl font-serif text-stone-900 leading-tight">
                                    Donnez vie à votre photo
                                </div>
                                <div className="mt-1 text-xs sm:text-sm text-stone-500">
                                    Réglages invisibles (stabilité visage, anti-flicker, rendu ciné). Avancé = optionnel.
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (isRendering) return;
                                    props.onClose();
                                }}
                                className={[
                                    "rounded-xl p-2 transition",
                                    isRendering ? "opacity-40 cursor-not-allowed" : "hover:bg-stone-100 text-stone-600",
                                ].join(" ")}
                                aria-label="Fermer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Mobile stepper (multi-dialogs) */}
                        <div className="mt-3 sm:hidden flex gap-2">
                            <SegButton active={panel === 0} label="Source" onClick={() => setPanel(0)} />
                            <SegButton active={panel === 1} label="Générer" onClick={() => setPanel(1)} />
                            <SegButton active={panel === 2} label="Live" onClick={() => setPanel(2)} />
                        </div>
                    </div>

                    {/* Body: Mobile carousel / Desktop triple-dialog layout */}
                    <div className="relative overflow-scroll h-[calc(92vh-140px)] sm:h-auto">
                        {/* MOBILE: swipe carousel */}
                        <div
                            ref={carouselRef}
                            className="sm:hidden h-full overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory scroll-smooth"
                            style={{ WebkitOverflowScrolling: "touch" }}
                        >
                            {/* Panel 0: Source */}
                            <div className="snap-start shrink-0 w-full h-full p-4">
                                <SourceDialog
                                    source={props.source}
                                    credits={props.credits}
                                    qPhase={qPhase}
                                    qScore={qScore}
                                    pct={pct}
                                    isRendering={isRendering}
                                    livePreviewUrl={live?.previewUrl ?? null}
                                />
                            </div>

                            {/* Panel 1: Generate */}
                            <div className="snap-start shrink-0 w-full h-full p-4 overflow-scroll">
                                <GenerateDialog
                                    canGenerate={canGenerate}
                                    credits={props.credits}
                                    isRendering={isRendering}
                                    timelineCount={props.timelineCount}
                                    suggestedPack={suggestedPack}
                                    onPurchaseCredits={props.onPurchaseCredits}
                                    onGenerate={() =>
                                        props.onGenerate({
                                            durationSec: 3,
                                            prompt: hiddenPrompt,
                                            options: hiddenOptions,
                                        })
                                    }
                                    advancedOpen={advancedOpen}
                                    onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
                                />

                                {advancedOpen && (
                                    <AdvancedDrawer
                                        restoreColor={restoreColor}
                                        onToggleRestoreColor={() => setRestoreColor((v) => !v)}
                                        selected={selected}
                                        onTogglePreset={(k) =>
                                            setSelected((curr) => (curr.includes(k) ? curr.filter((x) => x !== k) : [...curr, k]))
                                        }
                                        extraPrompt={extraPrompt}
                                        onChangePrompt={setExtraPrompt}
                                        promptRef={promptRef}
                                        disabled={isRendering}
                                    />
                                )}
                            </div>

                            {/* Panel 2: Live/Result */}
                            <div className="snap-start shrink-0 w-full h-full p-4">
                                <ResultDialog
                                    step={step}
                                    pct={pct}
                                    qPhase={qPhase}
                                    error={live?.error ?? null}
                                    resultPreviewUrl={live?.resultPreviewUrl ?? null}
                                    lines={live?.lines ?? []}
                                />
                            </div>
                        </div>

                        {/* DESKTOP: multi-dialogs simultaneously */}
                        <div className="hidden sm:block p-6">
                            <div className="relative grid grid-cols-12 gap-6 items-start">
                                {/* Curved arrow connector */}
                                <div className="pointer-events-none absolute inset-0">
                                    <svg viewBox="0 0 1200 500" className="absolute inset-0 w-full h-full">
                                        <defs>
                                            <linearGradient id="arrowGrad" x1="0" x2="1">
                                                <stop offset="0%" stopColor="#fb7185" />
                                                <stop offset="100%" stopColor="#f59e0b" />
                                            </linearGradient>
                                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                                <feGaussianBlur stdDeviation="6" result="blur" />
                                                <feMerge>
                                                    <feMergeNode in="blur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                            <marker id="arrowHead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                                                <path d="M0,0 L10,5 L0,10 z" fill="url(#arrowGrad)" />
                                            </marker>
                                        </defs>

                                        {/* from left card to right card */}
                                        <path
                                            d="M220 300 C 420 110, 760 110, 980 250"
                                            fill="none"
                                            stroke="url(#arrowGrad)"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                            strokeDasharray="10 10"
                                            markerEnd="url(#arrowHead)"
                                            filter="url(#glow)"
                                            opacity="0.85"
                                        />
                                    </svg>
                                </div>

                                <div className="order-2 col-span-6">
                                    <div className="transform rotate-[-1deg]">
                                        <SourceDialog
                                            source={props.source}
                                            credits={props.credits}
                                            qPhase={qPhase}
                                            qScore={qScore}
                                            pct={pct}
                                            isRendering={isRendering}
                                            livePreviewUrl={live?.previewUrl ?? null}
                                        />
                                    </div>
                                </div>

                                <div className="col-start-1 col-span-12">
                                    <div className="transform translate-y-2">
                                        <GenerateDialog
                                            canGenerate={canGenerate}
                                            credits={props.credits}
                                            isRendering={isRendering}
                                            timelineCount={props.timelineCount}
                                            suggestedPack={suggestedPack}
                                            onPurchaseCredits={props.onPurchaseCredits}
                                            onGenerate={() =>
                                                props.onGenerate({
                                                    durationSec: 3,
                                                    prompt: hiddenPrompt,
                                                    options: hiddenOptions,
                                                })
                                            }
                                            advancedOpen={advancedOpen}
                                            onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
                                        />

                                        {advancedOpen && (
                                            <div className="mt-4">
                                                <AdvancedDrawer
                                                    restoreColor={restoreColor}
                                                    onToggleRestoreColor={() => setRestoreColor((v) => !v)}
                                                    selected={selected}
                                                    onTogglePreset={(k) =>
                                                        setSelected((curr) =>
                                                            curr.includes(k) ? curr.filter((x) => x !== k) : [...curr, k]
                                                        )
                                                    }
                                                    extraPrompt={extraPrompt}
                                                    onChangePrompt={setExtraPrompt}
                                                    promptRef={promptRef}
                                                    disabled={isRendering}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="order-3 col-span-6">
                                    <div className="transform rotate-[1deg]">
                                        <ResultDialog
                                            step={step}
                                            pct={pct}
                                            qPhase={qPhase}
                                            error={live?.error ?? null}
                                            resultPreviewUrl={live?.resultPreviewUrl ?? null}
                                            lines={live?.lines ?? []}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer hint */}
                    <div className="relative border-t border-stone-100 bg-white/70 backdrop-blur px-4 sm:px-6 py-3">
                        <div className="flex items-center justify-between gap-3 text-[11px] text-stone-500">
                            <div className="flex items-center gap-2">
                                <Stars size={14} className="text-amber-500" />
                                <span>
                  3s • stabilité visage • anti-flicker • rendu “film”
                </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-2">
                                <Info size={14} className="text-stone-400" />
                                <span>Avancé = optionnel</span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile swipe hint */}
                    <div className="sm:hidden absolute left-1/2 -translate-x-1/2 -top-2">
                        <div className="h-1.5 w-14 rounded-full bg-stone-300/70" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function CardShell(props: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="relative rounded-[22px] border border-stone-200 bg-white shadow-[0_22px_60px_-40px_rgba(2,6,23,0.35)] overflow-hidden">
            <div className="px-4 py-4 border-b border-stone-100 bg-gradient-to-b from-white to-stone-50">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                                {props.icon}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-stone-900">{props.title}</div>
                                <div className="text-xs text-stone-500">{props.subtitle}</div>
                            </div>
                        </div>
                    </div>
                    {props.right ? <div className="shrink-0">{props.right}</div> : null}
                </div>
            </div>
            <div className="p-4">{props.children}</div>
        </div>
    );
}

function SourceDialog(props: {
    source: Asset | null;
    credits: number;
    qPhase: any;
    qScore: number | null;
    pct: number;
    isRendering: boolean;
    livePreviewUrl: string | null;
}) {
    const score = props.qScore ?? (props.isRendering ? props.pct : 0);
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
                    {props.livePreviewUrl ? (
                        <video
                            src={props.livePreviewUrl}
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
                                Aperçu live pendant la génération
                            </div>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
                    <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center justify-between text-[11px] text-white/80 mb-1">
                            <span className="font-semibold">{phaseLabel(props.qPhase)}</span>
                            <span className="tabular-nums">{Math.round(score)}/100</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${score}%`, backgroundImage: "linear-gradient(90deg,#fb7185,#f59e0b)" }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                <div className="text-xs text-stone-700 font-semibold">
                    Restauration qualité (auto)
                </div>
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

function GenerateDialog(props: {
    canGenerate: boolean;
    credits: number;
    isRendering: boolean;
    timelineCount: number;
    suggestedPack: number;
    onPurchaseCredits?: (amount: number) => void;
    onGenerate: () => void;
    advancedOpen: boolean;
    onToggleAdvanced: () => void;
}) {
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
            {noCredits && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
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
                                props.onPurchaseCredits ? "bg-stone-900 hover:bg-stone-800" : "bg-stone-300 cursor-not-allowed",
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
                    "w-full rounded-2xl px-4 py-3 font-bold shadow-lg transition flex items-center justify-center gap-2 mt-4",
                    props.canGenerate ? "bg-stone-900 text-white hover:bg-stone-800" : "bg-stone-200 text-stone-500 cursor-not-allowed",
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
                className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition inline-flex items-center justify-center gap-2"
            >
                Options avancées {props.advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
        </CardShell>
    );
}

function AdvancedDrawer(props: {
    restoreColor: boolean;
    onToggleRestoreColor: () => void;
    selected: HiddenPresetKey[];
    onTogglePreset: (k: HiddenPresetKey) => void;
    extraPrompt: string;
    onChangePrompt: (v: string) => void;
    promptRef: React.RefObject<HTMLTextAreaElement>;
    disabled: boolean;
}) {
    return (
        <div className="mt-4 rounded-[22px] border border-stone-200 bg-white shadow-[0_18px_50px_-40px_rgba(2,6,23,0.25)] overflow-scroll">
            <div className="px-4 py-4 border-b border-stone-100 bg-gradient-to-b from-white to-stone-50">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold text-stone-900">Avancé</div>
                        <div className="text-xs text-stone-500">Style & options (optionnel)</div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700">
                        <Sparkles size={14} className="text-rose-500" />
                        Mode pro
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-3">
                {/* Restore color */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold text-stone-900">Restaurer les couleurs</div>
                        <div className="text-xs text-stone-500">Colorisation douce (désactivée par défaut).</div>
                    </div>

                    <button
                        type="button"
                        onClick={props.onToggleRestoreColor}
                        disabled={props.disabled}
                        className={[
                            "relative h-7 w-12 rounded-full transition border",
                            props.restoreColor ? "bg-rose-600 border-rose-600" : "bg-white border-stone-200",
                            props.disabled ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                        aria-label="Restaurer les couleurs"
                    >
            <span
                className={[
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                    props.restoreColor ? "left-5" : "left-0.5",
                ].join(" ")}
            />
                    </button>
                </div>

                {/* Presets */}
                <div>
                    <div className="text-[11px] font-bold uppercase text-stone-500">Styles</div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PRESETS.map((p) => {
                            const on = props.selected.includes(p.key);
                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => props.onTogglePreset(p.key)}
                                    disabled={props.disabled}
                                    className={[
                                        "text-left rounded-2xl border p-3 transition",
                                        on ? "border-rose-200 bg-rose-50" : "border-stone-200 bg-white hover:bg-stone-50",
                                        props.disabled ? "opacity-70 cursor-not-allowed" : "",
                                    ].join(" ")}
                                >
                                    <div className="text-sm font-semibold text-stone-900">{p.title}</div>
                                    <div className="mt-0.5 text-xs text-stone-500">{p.desc}</div>
                                    <div className="mt-2 text-[11px] font-semibold text-stone-600">
                                        {on ? "Activé" : "Désactivé"}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Prompt (advanced only) */}
                <div>
                    <div className="text-[11px] font-bold uppercase text-stone-500">Prompt (optionnel)</div>
                    <textarea
                        ref={props.promptRef}
                        rows={4}
                        disabled={props.disabled}
                        value={props.extraPrompt}
                        onChange={(e) => props.onChangePrompt(e.target.value)}
                        placeholder="Ex : été 1984, lumière douce, caméra très lente, émotion…"
                        className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                    />
                    <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-2 pb-4">
                        <Info size={14} className="text-amber-500" />
                        Le prompt s’ajoute aux réglages invisibles (anti-flicker, stabilité visage…).
                    </div>
                </div>
            </div>
        </div>
    );
}

function ResultDialog(props: {
    step: "idle" | "rendering" | "done" | "error";
    pct: number;
    qPhase: any;
    error: string | null;
    resultPreviewUrl: string | null;
    lines: string[];
}) {
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
                                    style={{ width: `${pct}%`, backgroundImage: "linear-gradient(90deg,#fb7185,#f59e0b)" }}
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
