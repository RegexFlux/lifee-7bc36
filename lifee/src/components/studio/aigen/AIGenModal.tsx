// components/lifee/aigen/AIGenModal.tsx
"use client";

import * as React from "react";
import { Info, Sparkles, Stars, X } from "lucide-react";

import { useMediaQuery} from "@/hooks/useMediaQuery";
import { useFocusTrap} from "@/hooks/useFocusTrap";

import type { AIGenModalProps, AIGenHiddenOptions} from "@/types/aigen";
import { PRESETS, buildHiddenPrompt, clamp, suggestCreditPack} from "@/types/aigen";

import { SegButton} from "@/components/studio/aigen/SegButton";
import { SourceDialog} from "@/components/studio/aigen/SourceDialog";
import { GenerateDialog} from "@/components/studio/aigen/GenerateDialog";
import { ResultDialog} from "@/components/studio/aigen/ResultDialog";
import {AdvancedInspectorOverlay} from "@/components/studio/aigen/AdvancedInspectorOverlay";

export function AIGenModal(props: AIGenModalProps) {
    const isDesktop = useMediaQuery("(min-width: 640px)");

    const [panel, setPanel] = React.useState<0 | 1 | 2>(1); // mobile only
    const [inspectorOpen, setInspectorOpen] = React.useState(false);

    // defaults
    const [selected, setSelected] = React.useState(() =>
        PRESETS.filter((p) => p.defaultOn).map((p) => p.key)
    );
    const [restoreColor, setRestoreColor] = React.useState(false);
    const [extraPrompt, setExtraPrompt] = React.useState("");

    const promptRef = React.useRef<HTMLTextAreaElement | null>(null);

    const modalRef = React.useRef<HTMLDivElement | null>(null);
    const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);

    // MOBILE carousel ref (horizontal)
    const carouselRef = React.useRef<HTMLDivElement | null>(null);

    const live = props.live;
    const step = live?.step ?? "idle";
    const isRendering = step === "rendering";
    const isDone = step === "done";
    const pct = clamp(live?.progress ?? 0, 0, 100);

    const qPhase =
        live?.quality?.phase ?? (isRendering ? "precheck" : isDone ? "done" : "idle");
    const qScore =
        typeof live?.quality?.score === "number"
            ? clamp(live.quality.score, 0, 100)
            : null;

    const suggestedPack = React.useMemo(
        () => suggestCreditPack(props.timelineCount),
        [props.timelineCount]
    );

    const hiddenOptions: AIGenHiddenOptions = React.useMemo(
        () => ({
            restoreColor,
            presets: selected,
            extraPrompt: extraPrompt.trim() ? extraPrompt : "",
        }),
        [restoreColor, selected, extraPrompt]
    );


    const hiddenPrompt = React.useMemo(
        () => buildHiddenPrompt(hiddenOptions),
        [hiddenOptions]
    );

    const canGenerate = !!props.source && props.credits > 0 && !isRendering;

    // Focus trap / ESC
    useFocusTrap({
        active: props.open,
        containerRef: modalRef as React.RefObject<HTMLElement>,
        initialFocusRef: closeBtnRef as React.RefObject<HTMLElement>,
        onEscape: () => {
            if (isRendering) return;
            props.onClose();
        },
    });

    // Mobile carousel scroll (no vertical scroll on the carousel itself)
    React.useEffect(() => {
        if (!props.open) return;
        if (isDesktop) return;

        const el = carouselRef.current;
        if (!el) return;

        const w = el.clientWidth;
        el.scrollTo({ left: w * panel, behavior: "smooth" });
    }, [panel, props.open, isDesktop]);

    // Focus prompt when advanced opens
    React.useEffect(() => {
        if (!props.open) return;
        if (!inspectorOpen) return;

        const t = window.setTimeout(() => promptRef.current?.focus?.(), 80);
        return () => window.clearTimeout(t);
    }, [inspectorOpen, props.open]);

    // keep panel sane when switching to desktop
    React.useEffect(() => {
        if (isDesktop) setPanel(1);
    }, [isDesktop]);

    if (!props.open) return null;

    const titleId = "aigen-title";
    const descId = "aigen-desc";

    console.log({
        ...props
    })

    return (
        <div className="fixed inset-0 z-[60]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
                onClick={() => {
                    if (isRendering) return;
                    props.onClose();
                }}
                aria-hidden="true"
            />

            {/* Centering container */}
            <div className="absolute inset-x-0 bottom-0 top-10 sm:top-8 flex items-end sm:items-center justify-center p-3 sm:p-6">
                {/* Dialog */}
                <div
                    ref={modalRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={descId}
                    className={[
                        "relative w-full max-w-5xl",
                        "h-[92vh] sm:h-auto sm:max-h-[86vh]",
                        "rounded-[28px] border border-stone-200 bg-white shadow-2xl overflow-hidden",
                        // ✅ IMPORTANT: the dialog itself is a flex column, so no more calc() heights
                        "flex flex-col",
                    ].join(" ")}
                >
                    {/* Ambient */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
                        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />
                        <div className="absolute inset-0 opacity-[0.10] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                    </div>

                    {/* Header (fixed height, no scroll) */}
                    <div className="relative shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-stone-100 bg-white/75 backdrop-blur">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-stone-700 shadow-sm">
                                    <Sparkles size={12} className="text-rose-500" />
                                    Génération IA • 3s • Style film
                                </div>

                                <div
                                    id={titleId}
                                    className="mt-2 text-xl sm:text-2xl font-serif text-stone-900 leading-tight"
                                >
                                    Donnez vie à votre photo
                                </div>

                                <div id={descId} className="mt-1 text-xs sm:text-sm text-stone-500">
                                    Réglages invisibles (stabilité visage, anti-flicker, rendu ciné). Avancé = optionnel.
                                </div>
                            </div>

                            <button
                                ref={closeBtnRef}
                                type="button"
                                onClick={() => {
                                    if (isRendering) return;
                                    props.onClose();
                                }}
                                className={[
                                    "rounded-xl p-2 transition",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                                    isRendering
                                        ? "opacity-40 cursor-not-allowed"
                                        : "hover:bg-stone-100 text-stone-600",
                                ].join(" ")}
                                aria-label="Fermer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Mobile stepper */}
                        {!isDesktop && (
                            <div className="mt-3 flex gap-2">
                                <SegButton active={panel === 0} label="Source" onClick={() => setPanel(0)} />
                                <SegButton active={panel === 1} label="Générer" onClick={() => setPanel(1)} />
                                <SegButton active={panel === 2} label="Live" onClick={() => setPanel(2)} />
                            </div>
                        )}
                    </div>

                    {/* ✅ BODY (reworked completely): ONE vertical scroll area on desktop, per-panel vertical scroll on mobile */}
                    <div className="relative flex-1 min-h-0">
                        <div
                            className={inspectorOpen ? "h-full overflow-hidden" : "h-full"}
                            {...(inspectorOpen ? ({ inert: "" } as any) : {})}
                            aria-hidden={inspectorOpen ? true : undefined}
                        />
                        {/* MOBILE: horizontal carousel, each panel has its own vertical scroll */}
                        {!isDesktop && (
                            <div className="h-full overflow-hidden">
                                <div
                                    ref={carouselRef}
                                    className={[
                                        "h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth",
                                        "overscroll-x-contain",
                                        // make the horizontal scroller not fight with iOS momentum
                                        "touch-pan-x",
                                    ].join(" ")}
                                    style={{
                                        WebkitOverflowScrolling: "touch",
                                        // helps keep layout stable when scrollbars appear/disappear (supported browsers)
                                        scrollbarGutter: "stable both-edges",
                                    }}
                                >
                                    {/* Panel 0 */}
                                    <section className="snap-start shrink-0 w-full h-full overflow-y-auto overscroll-y-contain px-4 py-4">
                                        <SourceDialog
                                            source={props.source}
                                            credits={props.credits}
                                            qPhase={qPhase}
                                            qScore={qScore}
                                            pct={pct}
                                            isRendering={isRendering}
                                            thumbnailUrl={live?.thumbnailUrl ?? null}
                                        />
                                        <div className="h-6" />
                                    </section>

                                    {/* Panel 1 */}
                                    <section className="snap-start shrink-0 w-full h-full overflow-y-auto overscroll-y-contain px-4 py-4">
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
                                            advancedOpen={inspectorOpen}
                                            onToggleAdvanced={() => setInspectorOpen((v) => !v)}
                                        />

                                        <div className="h-6" />
                                    </section>

                                    {/* Panel 2 */}
                                    <section className="snap-start shrink-0 w-full h-full overflow-y-auto overscroll-y-contain px-4 py-4">
                                        <ResultDialog
                                            step={step}
                                            pct={pct}
                                            qPhase={qPhase}
                                            error={live?.error ?? null}
                                            resultPreviewUrl={live?.resultPreviewUrl ?? null}
                                            lines={live?.lines ?? []}
                                        />
                                        <div className="h-6" />
                                    </section>
                                </div>
                            </div>
                        )}

                        {/* DESKTOP: one single vertical scroll container for the whole grid */}
                        {isDesktop && (
                            <div
                                className="h-full overflow-y-auto overscroll-y-contain px-6 py-6"
                                style={{ scrollbarGutter: "stable both-edges" }}
                            >
                                <div className="relative grid grid-cols-12 gap-6 items-start pb-2">
                                    {/* Curved arrow connector */}
                                    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
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
                                                <marker
                                                    id="arrowHead"
                                                    markerWidth="10"
                                                    markerHeight="10"
                                                    refX="8"
                                                    refY="5"
                                                    orient="auto"
                                                >
                                                    <path d="M0,0 L10,5 L0,10 z" fill="url(#arrowGrad)" />
                                                </marker>
                                            </defs>
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

                                    <div className="col-span-4">
                                        <div className="transform rotate-[-1deg]">
                                            <SourceDialog
                                                source={props.source}
                                                credits={props.credits}
                                                qPhase={qPhase}
                                                qScore={qScore}
                                                pct={pct}
                                                isRendering={isRendering}
                                                thumbnailUrl={live?.thumbnailUrl ?? null}
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-4">
                                        <div className="transform translate-y-2 space-y-4">
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
                                                advancedOpen={inspectorOpen}
                                                onToggleAdvanced={() => setInspectorOpen((v) => !v)}
                                            />

                                        </div>
                                    </div>

                                    <div className="col-span-4">
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

                                {/* bottom breathing room */}
                                <div className="h-4" />
                            </div>
                        )}
                    </div>
                        <AdvancedInspectorOverlay
                            open={inspectorOpen}
                            onClose={() => setInspectorOpen(false)}
                            isDesktop={isDesktop}
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
                            hiddenPromptPreview={hiddenPrompt}
                            onReset={() => {
                                setRestoreColor(false);
                                setSelected(PRESETS.filter((p) => p.defaultOn).map((p) => p.key));
                                setExtraPrompt("");
                            }}
                        />
                    {/* Footer (fixed height, no scroll) */}
                    <div className="relative shrink-0 border-t border-stone-100 bg-white/70 backdrop-blur px-4 sm:px-6 py-3">
                        <div className="flex items-center justify-between gap-3 text-[11px] text-stone-500">
                            <div className="flex items-center gap-2">
                                <Stars size={14} className="text-amber-500" />
                                <span>3s • stabilité visage • anti-flicker • rendu “film”</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-2">
                                <Info size={14} className="text-stone-400" />
                                <span>Avancé = optionnel</span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile swipe handle */}
                    {!isDesktop && (
                        <div className="absolute left-1/2 -translate-x-1/2 -top-2" aria-hidden="true">
                            <div className="h-1.5 w-14 rounded-full bg-stone-300/70" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
