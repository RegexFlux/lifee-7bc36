// components/studio/GuestLinkAccountNudge.tsx
"use client";

import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {ChevronRight, ShieldCheck, Sparkles, X} from "lucide-react";

type Props = {
    email?: string | null;

    /** Ouvre la modale d’association (ton control existant). */
    onOpenModal: () => void;

    /**
     * Pour “attirer l’attention sur le control” : on le cible.
     * Exemple: targetSelector='[data-link-account-button]'
     */
    targetSelector?: string;

    /** Fallback si le target n’existe pas ou si tu préfères un widget flottant. */
    position?: "br" | "bl";

    /**
     * Endpoint optionnel à appeler au click (si tu veux “start link” côté back).
     * Exemple: "/api/account/link/start"
     */
    startLinkEndpoint?: string;

    /** Payload optionnel envoyé au startLinkEndpoint (si tu veux). */
    startLinkBody?: Record<string, unknown>;

    /** Désactiver l’appel réseau (laisse juste l’ouverture de modale). */
    disableNetwork?: boolean;

    /** Clé localStorage pour masquer le nudge après dismiss. */
    storageKey?: string;

    /** Délai avant affichage (ms). */
    showDelayMs?: number;

    /** Laisse le user fermer temporairement. */
    allowDismiss?: boolean;
};

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function isGuestEmail(email?: string | null) {
    if (!email) return false;
    return email.toLowerCase().endsWith("@lifee.invalid");
}

type Rect = { top: number; left: number; width: number; height: number };

function readRect(el: Element): Rect | null {
    const r = el.getBoundingClientRect();
    if (!Number.isFinite(r.top) || !Number.isFinite(r.left)) return null;
    if (r.width <= 0 || r.height <= 0) return null;
    return {top: r.top, left: r.left, width: r.width, height: r.height};
}

async function safePostJson(url: string, body: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        const res = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body ?? {}),
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            return {ok: false, error: txt || `HTTP ${res.status}`};
        }
        return {ok: true};
    } catch (e: any) {
        return {ok: false, error: e?.message || "Network error"};
    }
}

export function GuestLinkAccountNudgeModal({
                                               email,
                                               onOpenModal,
                                               targetSelector = '[data-link-account-button]',
                                               position = "br",
                                               startLinkEndpoint,
                                               startLinkBody,
                                               disableNetwork = false,
                                               storageKey = "lifee:guest-link-nudge:v1",
                                               showDelayMs = 700,
                                               allowDismiss = true,
                                           }: Props) {
    const isGuest = useMemo(() => isGuestEmail(email), [email]);

    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const [rect, setRect] = useState<Rect | null>(null);
    const [fallbackFloating, setFallbackFloating] = useState(false);

    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const rafRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);

    const prefersReducedMotion = useMemo(() => {
        if (typeof window === "undefined") return true;
        return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    }, []);

    useEffect(() => setMounted(true), []);

    // Load dismissed state
    useEffect(() => {
        if (!mounted) return;
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw === "1") setDismissed(true);
        } catch {
        }
    }, [mounted, storageKey]);

    // Show logic
    useEffect(() => {
        if (!mounted) return;
        if (!isGuest) {
            setVisible(false);
            return;
        }
        if (dismissed) return;

        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setVisible(true), showDelayMs);

        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
            timerRef.current = null;
        };
    }, [mounted, isGuest, dismissed, showDelayMs]);

    // Auto-hide toast
    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(null), 1600);
        return () => window.clearTimeout(t);
    }, [toast]);

    // Measure target
    useLayoutEffect(() => {
        if (!mounted || !visible) return;

        const update = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                const el = document.querySelector(targetSelector);
                const r = el ? readRect(el) : null;
                setRect(r);

                // fallback si introuvable
                setFallbackFloating(!r);
            });
        };

        update();

        const onScroll = () => update();
        const onResize = () => update();

        window.addEventListener("scroll", onScroll, {passive: true, capture: true});
        window.addEventListener("resize", onResize);

        // Observe target size changes (si dispo)
        const el = document.querySelector(targetSelector);
        let ro: ResizeObserver | null = null;
        if (el && "ResizeObserver" in window) {
            ro = new ResizeObserver(() => update());
            ro.observe(el as Element);
        }

        return () => {
            window.removeEventListener("scroll", onScroll as any, true);
            window.removeEventListener("resize", onResize as any);
            if (ro) ro.disconnect();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [mounted, visible, targetSelector]);

    const dismiss = () => {
        setVisible(false);
        setDismissed(true);
        try {
            localStorage.setItem(storageKey, "1");
        } catch {
        }
    };

    const open = async () => {
        // 1) Optionnel: ping le back
        if (startLinkEndpoint && !disableNetwork) {
            setBusy(true);
            const res = await safePostJson(startLinkEndpoint, startLinkBody ?? {});
            setBusy(false);
            if (!res.ok) {
                // On n’empêche PAS l’ouverture de modale (objectif: conversion)
                setToast("On ouvre quand même 🙂");
            }
        }

        // 2) Ouvre la modale
        onOpenModal();

        // 3) On peut masquer le nudge après action (moins intrusif)
        dismiss();
    };

    if (!mounted || !visible || !isGuest) return null;

    const posClass = position === "bl" ? "left-4 sm:left-6" : "right-4 sm:right-6";

    // Callout placement (si rect dispo)
    const callout = rect
        ? (() => {
            const margin = 12;
            const bubbleW = 340;
            const bubbleH = 132;

            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - (rect.top + rect.height);

            const placeAbove = spaceAbove > bubbleH + 24;
            const top = placeAbove ? rect.top - bubbleH - margin : rect.top + rect.height + margin;

            // align bubble to the right edge of the target (clamped)
            const preferredLeft = rect.left + rect.width - bubbleW;
            const left = Math.max(12, Math.min(preferredLeft, window.innerWidth - bubbleW - 12));

            // Arrow x: point roughly to center of target
            const arrowX = Math.max(18, Math.min(rect.left + rect.width / 2 - left, bubbleW - 18));

            return {top, left, bubbleW, bubbleH, placeAbove, arrowX};
        })()
        : null;

    const ui = (
        <>
            {/* Subtle spotlight ring on the target control */}
            {rect && (
                <div
                    aria-hidden="true"
                    className={cx(
                        "fixed z-[80] pointer-events-none",
                        !prefersReducedMotion && "animate-[pulse_1.8s_ease-in-out_infinite]"
                    )}
                    style={{
                        top: Math.max(0, rect.top - 8),
                        left: Math.max(0, rect.left - 8),
                        width: rect.width + 16,
                        height: rect.height + 16,
                        borderRadius: 18,
                        boxShadow:
                            "0 0 0 1px rgba(15,23,42,0.14), 0 0 0 10px rgba(244,63,94,0.08), 0 18px 60px rgba(15,23,42,0.15)",
                        background: "rgba(255,255,255,0.10)",
                        backdropFilter: "blur(2px)",
                    }}
                />
            )}

            {/* Callout near target (preferred) */}
            {callout && !fallbackFloating ? (
                <div className="fixed z-[81]" style={{top: callout.top, left: callout.left, width: callout.bubbleW}}>
                    <div
                        className={cx(
                            "relative rounded-3xl border border-stone-200 bg-white/92 backdrop-blur shadow-md overflow-hidden",
                            !prefersReducedMotion && "animate-[pop_520ms_cubic-bezier(0.2,0.9,0.2,1)]"
                        )}
                        role="status"
                        aria-live="polite"
                        tabIndex={0}
                    >
                        {/* glow */}
                        <span
                            aria-hidden="true"
                            className="absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-70"
                            style={{background: "radial-gradient(circle, rgba(244,63,94,0.38), transparent 60%)"}}
                        />
                        <span
                            aria-hidden="true"
                            className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full blur-2xl opacity-70"
                            style={{background: "radial-gradient(circle, rgba(245,158,11,0.30), transparent 60%)"}}
                        />

                        <div className="relative p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="inline-flex items-center gap-2">
                    <span
                        className="h-9 w-9 rounded-2xl border border-stone-200 bg-white grid place-items-center shadow-sm">
                      <Sparkles size={16} className="text-rose-500"/>
                    </span>
                                        <div>
                                            <div className="text-sm font-black text-stone-900">Vous êtes en mode
                                                invité
                                            </div>
                                            <div className="text-[12px] text-stone-600 mt-0.5">
                                                Associez un email pour garder vos créations.
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="mt-2 inline-flex items-center gap-2 rounded-full bg-stone-50 border border-stone-200 px-3 py-1">
                                        <ShieldCheck size={14} className="text-stone-700"/>
                                        <span className="text-[11px] font-semibold text-stone-700">
                      Pas besoin de confirmer (même si un email part)
                    </span>
                                    </div>
                                </div>

                                {allowDismiss ? (
                                    <button
                                        onClick={dismiss}
                                        className="shrink-0 rounded-2xl border border-stone-200 bg-white/80 hover:bg-white px-2.5 py-2 transition"
                                        aria-label="Fermer"
                                        title="Fermer"
                                    >
                                        <X size={14} className="text-stone-700"/>
                                    </button>
                                ) : null}
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    onClick={() => void open()}
                                    disabled={busy}
                                    className={cx(
                                        "flex-1 rounded-2xl bg-stone-900 text-white px-4 py-3 text-sm font-black",
                                        "hover:opacity-95 active:scale-[0.99] transition",
                                        "focus:outline-none focus:ring-2 focus:ring-rose-200",
                                        busy && "opacity-70 cursor-not-allowed"
                                    )}
                                >
                  <span className="inline-flex items-center justify-center gap-2">
                    Associer mon compte
                    <ChevronRight size={16}/>
                  </span>
                                </button>
                            </div>

                            {toast ? (
                                <div className="mt-2 text-[11px] font-semibold text-stone-600">{toast}</div>
                            ) : null}
                        </div>

                        {/* Arrow */}
                        <div
                            aria-hidden="true"
                            className="absolute"
                            style={{
                                left: callout.arrowX,
                                top: callout.placeAbove ? "100%" : -10,
                                width: 18,
                                height: 18,
                                transform: callout.placeAbove ? "translateX(-50%) rotate(45deg)" : "translateX(-50%) rotate(45deg)",
                                background: "rgba(255,255,255,0.92)",
                                borderLeft: "1px solid rgba(231,229,228,1)",
                                borderTop: "1px solid rgba(231,229,228,1)",
                                boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
                            }}
                        />
                    </div>
                </div>
            ) : (
                // Fallback floating widget (si target absent)
                <div className={cx("fixed bottom-4 sm:bottom-6 z-[81]", posClass)}>
                    <div
                        className="relative rounded-3xl border border-stone-200 bg-white/92 backdrop-blur shadow-md w-[340px] overflow-hidden">
            <span
                aria-hidden="true"
                className="absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-70"
                style={{background: "radial-gradient(circle, rgba(244,63,94,0.34), transparent 60%)"}}
            />
                        <div className="relative p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-sm font-black text-stone-900 flex items-center gap-2">
                                        <Sparkles size={16} className="text-rose-500"/>
                                        Mode invité
                                    </div>
                                    <div className="mt-1 text-[12px] text-stone-600">
                                        Associez un email pour garder vos créations.
                                    </div>
                                </div>

                                {allowDismiss ? (
                                    <button
                                        onClick={dismiss}
                                        className="shrink-0 rounded-2xl border border-stone-200 bg-white/80 hover:bg-white px-2.5 py-2 transition"
                                        aria-label="Fermer"
                                        title="Fermer"
                                    >
                                        <X size={14} className="text-stone-700"/>
                                    </button>
                                ) : null}
                            </div>

                            <button
                                onClick={() => void open()}
                                disabled={busy}
                                className={cx(
                                    "mt-3 w-full rounded-2xl bg-stone-900 text-white px-4 py-3 text-sm font-black",
                                    "hover:opacity-95 active:scale-[0.99] transition",
                                    "focus:outline-none focus:ring-2 focus:ring-rose-200",
                                    busy && "opacity-70 cursor-not-allowed"
                                )}
                            >
                <span className="inline-flex items-center justify-center gap-2">
                  Associer mon compte
                  <ChevronRight size={16}/>
                </span>
                            </button>

                            {toast ?
                                <div className="mt-2 text-[11px] font-semibold text-stone-600">{toast}</div> : null}
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    return createPortal(ui, document.body);
}
