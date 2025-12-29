"use client";

import React, {useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {ChevronLeft, ChevronRight, X, Sparkles} from "lucide-react";

type Placement = "auto" | "top" | "bottom" | "left" | "right";
type MultiMode = "auto" | "single" | "union";

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
    multi?: MultiMode; // NEW: handle multiple matching targets
    avoidScrolling?: boolean;
};

type Mode = "walkthrough" | "map";

type DeferOpen = {
    /** attend que tous ces selectors existent + aient un rect valide */
    selectors?: string[];
    /** attend aussi un event window (utile si tu veux signaler “sidebar settled”) */
    eventName?: string;
    /** combien de temps les rects doivent rester stables */
    stableMs?: number;
    /** timeout de sécurité */
    // NEW (optionnel): réglages spécifiques aux transitions d'étapes
    stepStableMs?: number;
    stepTimeoutMs?: number;
    stepMinWaitMs?: number; // petite attente pour laisser démarrer une transition (sidebar)
};

function raf2() {
    return new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

type Props = {
    steps: TourStep[];
    storageKey?: string; // remembers completion
    defaultMode?: Mode;
    forceOpen?: boolean; // for debugging
    onClose?: () => void;
    onIndexChange?: (index: number) => void;
    deferOpen?: DeferOpen;
};

function rectSigForSelectors(selectors: string[]) {
    const sig: number[] = [];
    for (const sel of selectors) {
        const els = Array.from(document.querySelectorAll(sel));
        if (els.length === 0) return {ok: false as const, sig: [] as number[]};

        // On concatène les rects “visibles” (w/h > 1). Pas besoin d’être dans le viewport.
        const rects = els
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.width > 1 && r.height > 1);

        if (rects.length === 0) return {ok: false as const, sig: [] as number[]};

        // signature simple
        for (const r of rects) {
            sig.push(
                Math.round(r.left),
                Math.round(r.top),
                Math.round(r.width),
                Math.round(r.height)
            );
        }
    }
    return {ok: true as const, sig};
}

function sigEqual(a: number[], b: number[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

async function waitForLayoutStable(opts: {
    selectors: string[];
    stableMs: number;
    timeoutMs: number;
}) {
    const {selectors, stableMs, timeoutMs} = opts;

    const start = performance.now();
    let lastSig: number[] | null = null;
    let stableSince = 0;

    return await new Promise<void>((resolve) => {
        const tick = () => {
            const now = performance.now();
            if (now - start > timeoutMs) return resolve();

            const {ok, sig} = rectSigForSelectors(selectors);
            if (!ok) {
                lastSig = null;
                stableSince = 0;
                requestAnimationFrame(tick);
                return;
            }

            if (lastSig && sigEqual(lastSig, sig)) {
                if (!stableSince) stableSince = now;
                if (now - stableSince >= stableMs) return resolve();
            } else {
                lastSig = sig;
                stableSince = 0;
            }

            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    });
}

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
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
    };
}

function isInViewport(r: { left: number; top: number; right: number; bottom: number }) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return r.right >= 0 && r.bottom >= 0 && r.left <= vw && r.top <= vh;
}

function unionRects(rects: Array<{ x: number; y: number; w: number; h: number }>) {
    const left = Math.min(...rects.map((r) => r.x));
    const top = Math.min(...rects.map((r) => r.y));
    const right = Math.max(...rects.map((r) => r.x + r.w));
    const bottom = Math.max(...rects.map((r) => r.y + r.h));
    return {x: left, y: top, w: right - left, h: bottom - top};
}

function pickPlacementAuto(rect: { x: number; y: number; w: number; h: number }) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceTop = rect.y;
    const spaceBottom = vh - (rect.y + rect.h);
    const spaceLeft = rect.x;
    const spaceRight = vw - (rect.x + rect.w);

    const best = [
        {p: "bottom" as const, s: spaceBottom},
        {p: "top" as const, s: spaceTop},
        {p: "right" as const, s: spaceRight},
        {p: "left" as const, s: spaceLeft},
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
    const {rect, placement, cardW, cardH, gap} = args;
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

    const margin = 14;
    x = clamp(x, margin, vw - cardW - margin);
    y = clamp(y, margin, vh - cardH - margin);

    return {x, y};
}


function useTargetRects(selector: string, padding = 10) {
    const [data, setData] = useState<{
        elements: Element[];
        rects: Array<{ x: number; y: number; w: number; h: number }>;
        union: { x: number; y: number; w: number; h: number } | null;
    }>({elements: [], rects: [], union: null});

    useLayoutEffect(() => {
        if (!selector) {
            setData({elements: [], rects: [], union: null});
            return;
        }

        let raf = 0;
        let ro: ResizeObserver | null = null;

        const update = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const els = Array.from(document.querySelectorAll(selector));
                if (els.length === 0) {
                    setData({elements: [], rects: [], union: null});
                    return;
                }

                const rects = els
                    .map((el) => getElRect(el))
                    .filter((r) => r.w > 1 && r.h > 1)
                    .filter((r) => isInViewport(r))
                    .map((r) => ({
                        x: r.x - padding,
                        y: r.y - padding,
                        w: r.w + padding * 2,
                        h: r.h + padding * 2,
                    }));

                if (rects.length === 0) {
                    // targets exist but none are visible
                    setData({elements: els, rects: [], union: null});
                    return;
                }

                const u = unionRects(rects);
                setData({elements: els, rects, union: u});
            });
        };

        update();

        const onScroll = () => update();
        const onResize = () => update();

        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);

        if ("ResizeObserver" in window) {
            ro = new ResizeObserver(update);
            const els = Array.from(document.querySelectorAll(selector));
            els.forEach((el) => ro?.observe(el));
        }

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
            ro?.disconnect();
        };
    }, [selector, padding]);

    return data;
}

function Pill({n, sub}: { n: number; sub?: number }) {
    return (
        <div
            className="relative grid h-7 w-7 place-items-center rounded-full bg-white/95 text-[11px] font-semibold text-neutral-900 shadow-[0_10px_30px_rgba(0,0,0,.18)] ring-1 ring-black/10">
            {n}
            {typeof sub === "number" && (
                <div
                    className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-neutral-900 text-[9px] font-semibold text-white ring-2 ring-white">
                    {sub + 1}
                </div>
            )}
        </div>
    );
}

export function TutorialOverlay({
                                    steps,
                                    storageKey = "lifee_tour_done_v1",
                                    defaultMode = "walkthrough",
                                    forceOpen = false,
                                    deferOpen,
                                    onClose,
                                    onIndexChange
                                }: Props) {
    const reduced = useReducedMotion();
    const portalId = useId();

    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>(defaultMode);
    const [i, setI] = useState(0);

    const openScrollRef = useRef<{ x: number; y: number } | null>(null);
    const openFocusRef = useRef<Element | null>(null);
    const openedOnceRef = useRef(false);


    const [uiSettling, setUiSettling] = useState(false);
    const settleTokenRef = useRef(0);

    const requestStep = (nextIndex: number, nextMatchIndex = 0) => {
        if (!open) return;

        const clamped = clamp(nextIndex, 0, steps.length - 1);
        if (clamped === i && nextMatchIndex === matchIndex) return;

        // Si déjà en settling, on ignore (simple + safe).
        if (uiSettling) return;

        const token = ++settleTokenRef.current;
        setUiSettling(true);

        // 1) on déclenche le layout side-effect (ex: sidebar open/close) AVANT de mesurer
        try {
            onIndexChange?.(clamped);
        } catch {
        }

        (async () => {
            const stableMs = deferOpen?.stepStableMs ?? deferOpen?.stableMs ?? 30;
            const timeoutMs = deferOpen?.stepTimeoutMs ?? 30;
            const minWaitMs = deferOpen?.stepMinWaitMs ?? 30;

            // Laisse React appliquer l’état + commencer les transitions CSS
            await raf2();
            if (minWaitMs > 0) await new Promise((r) => setTimeout(r, minWaitMs));

            const sel = steps[clamped]?.target;
            const selectors = sel ? [sel] : [];

            if (selectors.length) {
                await waitForLayoutStable({selectors, stableMs, timeoutMs});
                await raf2(); // flush final
            }

            // Cancel si une autre transition a été demandée
            if (settleTokenRef.current !== token) return;

            setMatchIndex(nextMatchIndex);
            setI(clamped);
            setUiSettling(false);
        })().catch(() => {
            // fallback: on commit quand même (sans rester bloqué)
            if (settleTokenRef.current === token) {
                setMatchIndex(nextMatchIndex);
                setI(clamped);
                setUiSettling(false);
            }
        });
    };


    // NEW: when a step matches multiple elements, we can focus one of them (for scroll + card anchoring).
    const [matchIndex, setMatchIndex] = useState(0);

    const cardRef = useRef<HTMLDivElement | null>(null);

    const step = steps[i];
    const pad = step?.padding ?? 12;
    const radius = step?.radius ?? 18;
    const multi: MultiMode = step?.multi ?? "auto";

    const targets = useTargetRects(step?.target ?? "", pad);

    // Derived spotlight + anchor
    const anchorRect = useMemo(() => {
        const r = targets.rects[matchIndex];
        return r ?? targets.rects[0] ?? targets.union;
    }, [targets.rects, targets.union, matchIndex]);

    const spotlightRect = useMemo(() => {
        if (!targets.union && !anchorRect) return null;
        const hasMany = targets.rects.length > 1;
        if (multi === "union") return targets.union ?? anchorRect;
        if (multi === "single") return anchorRect;
        // auto:
        return hasMany ? (targets.union ?? anchorRect) : anchorRect;
    }, [targets.union, targets.rects.length, anchorRect, multi]);

    const [pendingAutoOpen, setPendingAutoOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            openedOnceRef.current = false;
            return;
        }
        if (openedOnceRef.current) return;
        openedOnceRef.current = true;

        openScrollRef.current = {x: window.scrollX, y: window.scrollY};
        openFocusRef.current = document.activeElement;
    }, [open]);


    useEffect(() => {
        setMounted(true);

        if (forceOpen) {
            setOpen(true);
            return;
        }

        try {
            const done = localStorage.getItem(storageKey) === "1";
            if (!done) setPendingAutoOpen(true);
        } catch {
            setPendingAutoOpen(true);
        }
    }, [storageKey, forceOpen]);

    useEffect(() => {
        if (!mounted) return;
        if (!pendingAutoOpen) return;
        if (open) return;

        let canceled = false;

        (async () => {
            const stableMs = deferOpen?.stableMs ?? 220;
            const timeoutMs = deferOpen?.stepTimeoutMs ?? 5000;

            // 1) attendre fonts (souvent ça bouge les rects)
            try {
                await document.fonts?.ready;
            } catch {
            }

            // 2) attendre event optionnel
            if (deferOpen?.eventName) {
                await new Promise<void>((res) => {
                    const t = window.setTimeout(res, timeoutMs);
                    const onEvt = () => {
                        window.clearTimeout(t);
                        window.removeEventListener(deferOpen!.eventName!, onEvt);
                        res();
                    };
                    window.addEventListener(deferOpen.eventName!, onEvt, {once: true});
                });
            }

            // 3) attendre stabilité des rects (selectors)
            const selectors =
                deferOpen?.selectors?.length
                    ? deferOpen.selectors
                    : [steps[0]?.target].filter(Boolean) as string[];

            if (selectors.length) {
                await waitForLayoutStable({selectors, stableMs, timeoutMs});
            }

            // 4) double RAF = “layout flush”
            await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

            if (!canceled) {
                // Lance l'état externe AVANT d'ouvrir l'overlay (sidebar etc.)
                try {
                    onIndexChange?.(0);
                } catch {
                }

                // Laisse démarrer la transition + attends stabilité du step 0
                const stableMs0 = deferOpen?.stepStableMs ?? deferOpen?.stableMs ?? 220;
                const timeoutMs0 = deferOpen?.stepTimeoutMs ?? 5000;
                const minWaitMs0 = deferOpen?.stepMinWaitMs ?? 120;

                await raf2();
                if (minWaitMs0 > 0) await new Promise((r) => setTimeout(r, minWaitMs0));

                const s0 = steps[0]?.target ? [steps[0]!.target] : [];
                if (s0.length) {
                    await waitForLayoutStable({selectors: s0, stableMs: stableMs0, timeoutMs: timeoutMs0});
                    await raf2();
                }

                if (!canceled) {
                    setOpen(true);
                    setPendingAutoOpen(false);
                }
            }

        })();

        return () => {
            canceled = true;
        };
    }, [mounted, pendingAutoOpen, open, deferOpen, steps]);

    // keep index valid
    useEffect(() => {
        if (i < 0) setI(0);
        if (i > steps.length - 1) setI(steps.length - 1);
    }, [i, steps.length]);

    // reset matchIndex when step changes
    useEffect(() => {
        setMatchIndex(0);
    }, [i]);

    // focus card
    useEffect(() => {
        if (!open) return;
        const t = window.setTimeout(() => {
            cardRef.current?.focus();
        }, 50);
        return () => window.clearTimeout(t);
    }, [open, i]);

    // scroll target into view on step change (use focused match)
    useEffect(() => {
        if (!open) return;
        const el =
            (targets.elements[matchIndex] as Element | undefined) ??
            (targets.elements[0] as Element | undefined) ??
            (document.querySelector(step?.target ?? "") as Element | null);

        if (!el) return;

        try {
            // if (!step?.avoidScrolling) {
            const isLast = i === steps.length - 1;
            el.scrollIntoView({
                block: "center",
                inline: "center",
                behavior: reduced || isLast ? "auto" : "smooth",
            });

            // }
        } catch {
            // ignore
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, i, matchIndex, step?.target, reduced]);

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
        } catch {
        }

        // (Optionnel) remettre ton UI dans un état neutre
        // ex: fermer sidebar, etc. -> à toi d’implémenter dans le parent
        try {
            onIndexChange?.(-1);
        } catch {
        }

        // Restore scroll + focus au prochain frame (évite les jumps)
        const snap = openScrollRef.current;
        const focusEl = openFocusRef.current;

        requestAnimationFrame(() => {
            if (snap) window.scrollTo({left: snap.x, top: snap.y, behavior: "auto"});
            if (focusEl instanceof HTMLElement) focusEl.focus?.();
        });

        onClose?.();
    };


    const prev = () => requestStep(i - 1, 0);
    const next = () => requestStep(i + 1, 0);


    const restart = () => {
        setMode("walkthrough");
        setI(0);
        setMatchIndex(0);
        setOpen(true);
        try {
            localStorage.removeItem(storageKey);
        } catch {
        }
    };

    const mapSteps = useMemo(
        () => steps.map((s, idx) => ({...s, idx})).filter((s) => s.showInMap !== false),
        [steps]
    );

    const cardSize = {w: 380, h: 220};

    const placement = useMemo(() => {
        if (!anchorRect) return "bottom" as const;
        const wanted = step?.placement ?? "auto";
        return wanted === "auto" ? pickPlacementAuto(anchorRect) : wanted;
    }, [anchorRect, step?.placement]);

    const cardPos = useMemo(() => {
        if (!anchorRect) return {x: 24, y: 24};
        return computeCardPosition({
            rect: anchorRect,
            placement,
            cardW: cardSize.w,
            cardH: cardSize.h,
            gap: 14,
        });
    }, [anchorRect, placement]);

    // Map markers (NEW: supports multiple per step)
    const markers = useMemo(() => {
        if (!open || mode !== "map") return [];

        const all: Array<{
            stepId: string;
            stepIdx: number;
            elIdx: number;
            x: number;
            y: number;
            multiCount: number;
        }> = [];

        for (const s of mapSteps) {
            const els = Array.from(document.querySelectorAll(s.target));
            const visible = els
                .map((el) => ({el, r: getElRect(el)}))
                .filter(({r}) => r.w > 1 && r.h > 1)
                .filter(({r}) => isInViewport(r));

            const count = visible.length;

            visible.forEach(({r}, elIdx) => {
                all.push({
                    stepId: s.id,
                    stepIdx: s.idx,
                    elIdx,
                    x: r.left + r.w / 2,
                    y: r.top + r.h / 2,
                    multiCount: count,
                });
            });
        }

        return all;
    }, [open, mode, mapSteps]);

    if (!mounted || !open || steps.length === 0) return null;

    const overlay = (
        <div id={portalId} className="fixed inset-0 z-[9999]">
            {/* Scrim */}
            <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: reduced ? 0 : 0.18}}
                className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_30%_0%,rgba(255,255,255,.10),transparent_60%),radial-gradient(900px_circle_at_90%_90%,rgba(120,255,170,.10),transparent_55%)]"
            />
            <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: reduced ? 0 : 0.18}}
                className="absolute inset-0 bg-black/55"
                onMouseDown={() => {
                    if (mode === "walkthrough") closeTour();
                }}
            />

            {/* Spotlight (walkthrough) */}
            {mode === "walkthrough" && spotlightRect && !uiSettling && (
                <>
                    {/* Hole using giant shadow */}
                    <motion.div
                        initial={{opacity: 0, scale: 0.98}}
                        animate={{opacity: 1, scale: 1}}
                        exit={{opacity: 0, scale: 0.98}}
                        transition={{duration: reduced ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1]}}
                        className="absolute"
                        style={{
                            left: spotlightRect.x,
                            top: spotlightRect.y,
                            width: spotlightRect.w,
                            height: spotlightRect.h,
                            borderRadius: radius,
                            boxShadow: "0 0 0 9999px rgba(0,0,0,.58)",
                            pointerEvents: "none",
                        }}
                    />

                    {/* Premium ring + subtle sweep */}
                    <motion.div
                        initial={{opacity: 0, y: 6}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: 6}}
                        transition={{duration: reduced ? 0 : 0.26, ease: [0.16, 1, 0.3, 1]}}
                        className="absolute"
                        style={{
                            left: spotlightRect.x,
                            top: spotlightRect.y,
                            width: spotlightRect.w,
                            height: spotlightRect.h,
                            borderRadius: radius,
                            pointerEvents: "none",
                        }}
                    >
                        <div
                            className="absolute inset-0 rounded-[inherit] ring-1 ring-white/35 shadow-[0_18px_60px_rgba(0,0,0,.40)]"/>
                        <div
                            className="absolute -inset-[2px] rounded-[inherit] bg-[linear-gradient(90deg,rgba(255,255,255,.08),rgba(150,255,200,.22),rgba(255,255,255,.08))] opacity-70 blur-[10px]"/>
                        {!reduced && (
                            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                                <div
                                    className="absolute -left-1/2 top-0 h-full w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)] opacity-35 animate-[lifeeSweep_1.6s_ease-in-out_infinite]"/>
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
                    <X className="h-4 w-4"/>
                </button>
            </div>

            {/* Map markers (multiple per step supported) */}
            {mode === "map" &&
                markers.map((m) => (
                    <button
                        key={`${m.stepId}:${m.elIdx}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{left: m.x, top: m.y}}
                        onClick={() => {
                            setI(m.stepIdx);
                            setMatchIndex(m.elIdx);
                        }}
                        aria-label={`Ouvrir l’aide: étape ${m.stepIdx + 1}`}
                    >
                        <Pill n={m.stepIdx + 1} sub={m.multiCount > 1 ? m.elIdx : undefined}/>
                    </button>
                ))}

            {/* Card */}
            <AnimatePresence mode="wait">
                {!uiSettling && (<motion.div
                    key={step.id + mode}
                    ref={cardRef}
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Tutoriel: ${step.title}`}
                    initial={{opacity: 0, y: 10, scale: 0.98}}
                    animate={{opacity: 1, y: 0, scale: 1}}
                    exit={{opacity: 0, y: 10, scale: 0.98}}
                    transition={{duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1]}}
                    className="absolute outline-none"
                    style={{
                        left: mode === "walkthrough" ? cardPos.x : 24,
                        top: mode === "walkthrough" ? cardPos.y : 84,
                        width: cardSize.w,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div
                        className="rounded-2xl bg-white/95 p-4 shadow-[0_30px_120px_rgba(0,0,0,.40)] ring-1 ring-black/10 max-w-[90dvw]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="grid h-7 w-7 place-items-center rounded-xl bg-neutral-900 text-white shadow-sm">
                                        <span className="text-[12px] font-semibold">{i + 1}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-neutral-950">{step.title}</div>
                                </div>

                                <div className="mt-2 text-sm leading-relaxed text-neutral-700">{step.body}</div>

                                {/* Optional: show “x elements” hint when multiple targets match */}
                                {targets.rects.length > 1 && (
                                    <div className="mt-2 text-[11px] text-neutral-500">
                                        {targets.rects.length} éléments concernés
                                        {multi === "union" || (multi === "auto" && targets.rects.length > 1) ? " (zone groupée)" : ""}
                                    </div>
                                )}
                            </div>

                            <div className="text-xs font-medium text-neutral-500">
                                {i + 1}/{steps.length}
                            </div>
                        </div>

                        {step.tip && (
                            <div
                                className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600 ring-1 ring-black/5">
                                <span className="font-semibold text-neutral-800">Pro tip :</span> {step.tip}
                            </div>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                            <button className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
                                    onClick={closeTour}>
                                Passer
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-900 ring-1 ring-black/5 hover:bg-neutral-200 disabled:opacity-40"
                                    onClick={prev}
                                    disabled={i === 0}
                                >
                                    <ChevronLeft className="h-4 w-4"/>
                                    Précédent
                                </button>

                                <button
                                    className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-40"
                                    onClick={i === steps.length - 1 ? closeTour : next}
                                >
                                    {i === steps.length - 1 ? "Terminer" : "Suivant"}
                                    <ChevronRight className="h-4 w-4"/>
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-1">
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 w-1.5 rounded-full ${idx === i ? "bg-neutral-900" : "bg-neutral-200"}`}
                                />
                            ))}
                            <div className="ml-auto text-[11px] text-neutral-400">Esc pour fermer • ← → pour naviguer
                            </div>
                        </div>
                    </div>
                </motion.div>)}
            </AnimatePresence>
        </div>
    );

    return createPortal(overlay, document.body);
}
