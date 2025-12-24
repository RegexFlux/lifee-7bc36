"use client";

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";

type Placement = "auto" | "top" | "bottom" | "left" | "right";

export type TourStep = {
    id: string;
    target: string; // CSS selector, ex: [data-tour="import"]
    title: string;
    body: string;
    tip?: string;
    placement?: Placement;
    padding?: number; // spotlight padding
    radius?: number; // spotlight radius
    showInMap?: boolean; // for “map mode”
};

type Mode = "walkthrough" | "map";

type Props = {
    steps: TourStep[];
    storageKey?: string; // remembers completion
    defaultMode?: Mode;
    forceOpen?: boolean; // for debugging
    onClose?: () => void;
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function getElRect(el: Element) {
    const r = el.getBoundingClientRect();
    return {
        x: r.left,
        y: r.top,
        w: r.width,
        h: r.height,
    };
}

function pickPlacementAuto(rect: { x: number; y: number; w: number; h: number }) {
    // Choose the side with more room
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceTop = rect.y;
    const spaceBottom = vh - (rect.y + rect.h);
    const spaceLeft = rect.x;
    const spaceRight = vw - (rect.x + rect.w);

    const best = [
        { p: "bottom" as const, s: spaceBottom },
        { p: "top" as const, s: spaceTop },
        { p: "right" as const, s: spaceRight },
        { p: "left" as const, s: spaceLeft },
    ].sort((a, b) => b.s - a.s)[0];

    return best.p;
}

function computeCardPosition(args: {
    rect: { x: number; y: number; w: number; h: number };
    placement: Exclude<Placement, "auto">;
    cardW: number;
    cardH: number;
    gap: number;
}) {
    const { rect, placement, cardW, cardH, gap } = args;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = rect.x;
    let y = rect.y;

    if (placement === "bottom") {
        x = rect.x + rect.w / 2 - cardW / 2;
        y = rect.y + rect.h + gap;
    } else if (placement === "top") {
        x = rect.x + rect.w / 2 - cardW / 2;
        y = rect.y - cardH - gap;
    } else if (placement === "right") {
        x = rect.x + rect.w + gap;
        y = rect.y + rect.h / 2 - cardH / 2;
    } else if (placement === "left") {
        x = rect.x - cardW - gap;
        y = rect.y + rect.h / 2 - cardH / 2;
    }

    // Clamp to viewport with safe margins
    const margin = 14;
    x = clamp(x, margin, vw - cardW - margin);
    y = clamp(y, margin, vh - cardH - margin);

    return { x, y };
}

function useSpotlight(targetSelector: string, padding = 10) {
    const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

    useLayoutEffect(() => {
        let raf = 0;

        const update = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const el = document.querySelector(targetSelector);
                if (!el) {
                    setRect(null);
                    return;
                }
                const r = getElRect(el);
                setRect({
                    x: r.x - padding,
                    y: r.y - padding,
                    w: r.w + padding * 2,
                    h: r.h + padding * 2,
                });
            });
        };

        update();

        const onScroll = () => update();
        const onResize = () => update();

        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);

        const el = document.querySelector(targetSelector);
        let ro: ResizeObserver | null = null;
        if (el && "ResizeObserver" in window) {
            ro = new ResizeObserver(update);
            ro.observe(el as Element);
        }

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
            if (ro) ro.disconnect();
        };
    }, [targetSelector, padding]);

    return rect;
}

function Pill({ n }: { n: number }) {
    return (
        <div className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-[11px] font-semibold text-neutral-900 shadow-[0_10px_30px_rgba(0,0,0,.18)] ring-1 ring-black/10">
            {n}
        </div>
    );
}

export function TutorialOverlay({
                                    steps,
                                    storageKey = "lifee_tour_done_v1",
                                    defaultMode = "walkthrough",
                                    forceOpen = false,
                                    onClose,
                                }: Props) {
    const reduced = useReducedMotion();
    const portalId = useId();

    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>(defaultMode);
    const [i, setI] = useState(0);

    const cardRef = useRef<HTMLDivElement | null>(null);

    const step = steps[i];
    const pad = step?.padding ?? 12;
    const radius = step?.radius ?? 18;

    const spotlight = useSpotlight(step?.target ?? "", pad);

    // open once (unless done)
    useEffect(() => {
        setMounted(true);
        if (forceOpen) {
            setOpen(true);
            return;
        }
        try {
            const done = localStorage.getItem(storageKey) === "1";
            if (!done) setOpen(true);
        } catch {
            setOpen(true);
        }
    }, [storageKey, forceOpen]);

    // keep index valid
    useEffect(() => {
        if (i < 0) setI(0);
        if (i > steps.length - 1) setI(steps.length - 1);
    }, [i, steps.length]);

    // focus card
    useEffect(() => {
        if (!open) return;
        const t = window.setTimeout(() => {
            cardRef.current?.focus();
        }, 50);
        return () => window.clearTimeout(t);
    }, [open, i]);

    // scroll target into view on step change
    useEffect(() => {
        if (!open) return;
        const el = document.querySelector(step?.target ?? "");
        if (!el) return;
        try {
            el.scrollIntoView({ block: "center", inline: "center", behavior: reduced ? "auto" : "smooth" });
        } catch {
            // ignore
        }
    }, [open, i, step?.target, reduced]);

    // keyboard nav
    useEffect(() => {
        if (!open) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                closeTour();
            }
            if (e.key === "ArrowRight") {
                e.preventDefault();
                next();
            }
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                prev();
            }
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, i]);

    const closeTour = () => {
        setOpen(false);
        try {
            localStorage.setItem(storageKey, "1");
        } catch {}
        onClose?.();
    };

    const prev = () => setI((v) => Math.max(0, v - 1));
    const next = () => setI((v) => Math.min(steps.length - 1, v + 1));

    const restart = () => {
        setMode("walkthrough");
        setI(0);
        setOpen(true);
        try {
            localStorage.removeItem(storageKey);
        } catch {}
    };

    const mapSteps = useMemo(
        () => steps.map((s, idx) => ({ ...s, idx })).filter((s) => s.showInMap !== false),
        [steps]
    );

    const cardSize = { w: 380, h: 220 };
    const placement = useMemo(() => {
        if (!spotlight) return "bottom" as const;
        const wanted = step?.placement ?? "auto";
        return wanted === "auto" ? pickPlacementAuto(spotlight) : wanted;
    }, [spotlight, step?.placement]);

    const cardPos = useMemo(() => {
        if (!spotlight) return { x: 24, y: 24 };
        return computeCardPosition({
            rect: spotlight,
            placement,
            cardW: cardSize.w,
            cardH: cardSize.h,
            gap: 14,
        });
    }, [spotlight, placement]);

    // Map markers positions
    const markers = useMemo(() => {
        if (!open || mode !== "map") return [];
        return mapSteps
            .map((s) => {
                const el = document.querySelector(s.target);
                if (!el) return null;
                const r = getElRect(el);
                return { stepId: s.id, idx: s.idx, x: r.x, y: r.y };
            })
            .filter(Boolean) as Array<{ stepId: string; idx: number; x: number; y: number }>;
    }, [open, mode, mapSteps, i]);

    if (!mounted || !open || steps.length === 0) return null;

    const overlay = (
        <div id={portalId} className="fixed inset-0 z-[9999]">
            {/* Scrim */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
                className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_30%_0%,rgba(255,255,255,.10),transparent_60%),radial-gradient(900px_circle_at_90%_90%,rgba(120,255,170,.10),transparent_55%)]"
            />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
                className="absolute inset-0 bg-black/55"
                onMouseDown={(e) => {
                    // click outside closes only in walkthrough (map is explorative)
                    if (mode === "walkthrough") closeTour();
                }}
            />

            {/* Spotlight (walkthrough) */}
            {mode === "walkthrough" && spotlight && (
                <>
                    {/* Hole using giant shadow (fast) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: reduced ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                        className="absolute"
                        style={{
                            left: spotlight.x,
                            top: spotlight.y,
                            width: spotlight.w,
                            height: spotlight.h,
                            borderRadius: radius,
                            boxShadow: "0 0 0 9999px rgba(0,0,0,.58)",
                            pointerEvents: "none",
                        }}
                    />

                    {/* Premium ring + subtle sweep */}
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: reduced ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute"
                        style={{
                            left: spotlight.x,
                            top: spotlight.y,
                            width: spotlight.w,
                            height: spotlight.h,
                            borderRadius: radius,
                            pointerEvents: "none",
                        }}
                    >
                        <div className="absolute inset-0 rounded-[inherit] ring-1 ring-white/35 shadow-[0_18px_60px_rgba(0,0,0,.40)]" />
                        <div className="absolute -inset-[2px] rounded-[inherit] bg-[linear-gradient(90deg,rgba(255,255,255,.08),rgba(150,255,200,.22),rgba(255,255,255,.08))] opacity-70 blur-[10px]" />
                        {!reduced && (
                            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                                <div className="absolute -left-1/2 top-0 h-full w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)] opacity-35 animate-[lifeeSweep_1.6s_ease-in-out_infinite]" />
                            </div>
                        )}
                    </motion.div>
                </>
            )}

            <div className="absolute right-4 top-4 flex items-center gap-2">
                <button
                    className="rounded-full bg-white/10 p-2 text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                    onClick={closeTour}
                    aria-label="Fermer"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Map markers */}
            {mode === "map" &&
                markers.map((m) => (
                    <button
                        key={m.stepId}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: m.x, top: m.y }}
                        onClick={() => setI(m.idx)}
                        aria-label={`Ouvrir l’aide: étape ${m.idx + 1}`}
                    >
                        <Pill n={m.idx + 1} />
                    </button>
                ))}

            {/* Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={step.id + mode}
                    ref={cardRef}
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Tutoriel: ${step.title}`}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute outline-none"
                    style={{
                        left: mode === "walkthrough" ? cardPos.x : 24,
                        top: mode === "walkthrough" ? cardPos.y : 84,
                        width: cardSize.w,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="rounded-2xl bg-white/95 p-4 shadow-[0_30px_120px_rgba(0,0,0,.40)] ring-1 ring-black/10">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="grid h-7 w-7 place-items-center rounded-xl bg-neutral-900 text-white shadow-sm">
                                        <span className="text-[12px] font-semibold">{i + 1}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-neutral-950">{step.title}</div>
                                </div>
                                <div className="mt-2 text-sm leading-relaxed text-neutral-700">{step.body}</div>
                            </div>
                            <div className="text-xs font-medium text-neutral-500">
                                {i + 1}/{steps.length}
                            </div>
                        </div>

                        {step.tip && (
                            <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600 ring-1 ring-black/5">
                                <span className="font-semibold text-neutral-800">Pro tip :</span> {step.tip}
                            </div>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                            <button
                                className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
                                onClick={closeTour}
                            >
                                Passer
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-900 ring-1 ring-black/5 hover:bg-neutral-200 disabled:opacity-40"
                                    onClick={prev}
                                    disabled={i === 0}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Précédent
                                </button>

                                <button
                                    className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-40"
                                    onClick={i === steps.length - 1 ? closeTour : next}
                                >
                                    {i === steps.length - 1 ? "Terminer" : "Suivant"}
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-1">
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 w-1.5 rounded-full ${
                                        idx === i ? "bg-neutral-900" : "bg-neutral-200"
                                    }`}
                                />
                            ))}
                            <div className="ml-auto text-[11px] text-neutral-400">Esc pour fermer • ← → pour naviguer</div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            <style jsx global>{`
        @keyframes lifeeSweep {
          0% { transform: translateX(-20%); opacity: 0.0; }
          20% { opacity: 0.35; }
          50% { opacity: 0.35; }
          80% { opacity: 0.15; }
          100% { transform: translateX(240%); opacity: 0.0; }
        }
      `}</style>
        </div>
    );

    return createPortal(overlay, document.body);
}
