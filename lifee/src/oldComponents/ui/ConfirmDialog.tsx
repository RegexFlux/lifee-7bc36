"use client";

// src/components/ui/ConfirmDialog.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
    ShieldAlert,
    X,
} from "lucide-react";

export function ConfirmDialog(props: Readonly<{
    open: boolean;
    title: string;
    description?: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
    onClose: () => void;
    loading?: boolean;

    // --- optional upgrades (non-breaking) ---
    cancelText?: string;
    icon?: React.ReactNode; // override icon
    tone?: "neutral" | "danger" | "success"; // default derived from danger
    lockCloseWhileLoading?: boolean; // default true
    showCloseButton?: boolean; // default true
    confirmHint?: string; // small helper under confirm button
}>) {
    const {
        open,
        title,
        description,
        confirmText,
        danger,
        onConfirm,
        onClose,
        loading,

        cancelText,
        icon,
        tone,
        lockCloseWhileLoading = true,
        showCloseButton = true,
        confirmHint,
    } = props;

    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const sheetRef = useRef<HTMLDivElement | null>(null);
    const lastActiveRef = useRef<HTMLElement | null>(null);

    const effectiveTone = useMemo(() => {
        if (tone) return tone;
        return danger ? "danger" : "neutral";
    }, [tone, danger]);

    const palette = useMemo(() => {
        if (effectiveTone === "danger") {
            return {
                ring: "focus-visible:ring-rose-200",
                chipBg: "bg-rose-50",
                chipBorder: "border-rose-200",
                chipText: "text-rose-700",
                primaryBtn: "bg-rose-600 hover:bg-rose-700",
                iconWrap: "bg-rose-50 border-rose-200 text-rose-600",
                glowA: "bg-rose-200/40",
                glowB: "bg-amber-200/25",
            };
        }
        if (effectiveTone === "success") {
            return {
                ring: "focus-visible:ring-emerald-200",
                chipBg: "bg-emerald-50",
                chipBorder: "border-emerald-200",
                chipText: "text-emerald-700",
                primaryBtn: "bg-emerald-600 hover:bg-emerald-700",
                iconWrap: "bg-emerald-50 border-emerald-200 text-emerald-600",
                glowA: "bg-emerald-200/35",
                glowB: "bg-sky-200/20",
            };
        }
        return {
            ring: "focus-visible:ring-stone-200",
            chipBg: "bg-stone-50",
            chipBorder: "border-stone-200",
            chipText: "text-stone-700",
            primaryBtn: "bg-stone-900 hover:bg-stone-800",
            iconWrap: "bg-stone-50 border-stone-200 text-stone-700",
            glowA: "bg-rose-200/25",
            glowB: "bg-amber-200/20",
        };
    }, [effectiveTone]);

    const defaultIcon = useMemo(() => {
        if (icon) return icon;
        if (effectiveTone === "danger") return <ShieldAlert size={18} />;
        if (effectiveTone === "success") return <CheckCircle2 size={18} />;
        return <AlertTriangle size={18} />;
    }, [icon, effectiveTone]);

    const canClose = !(loading && lockCloseWhileLoading);

    // detect mobile (client-only)
    useEffect(() => {
        setMounted(true);
        const update = () => {
            try {
                const mq = window.matchMedia("(max-width: 640px)");
                setIsMobile(mq.matches);
            } catch {
                setIsMobile(false);
            }
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // body scroll lock + remember focus
    useEffect(() => {
        if (!open) return;
        lastActiveRef.current = document.activeElement as HTMLElement | null;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
            lastActiveRef.current?.focus?.();
        };
    }, [open]);

    // focus first button + ESC to close
    useEffect(() => {
        if (!open) return;

        const focusFirst = () => {
            const el = sheetRef.current;
            if (!el) return;
            const focusable = el.querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            focusable?.focus();
        };

        const t = setTimeout(focusFirst, 60);

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (canClose) onClose();
            }
            if (e.key === "Tab") {
                // tiny focus trap
                const root = sheetRef.current;
                if (!root) return;
                const nodes = Array.from(
                    root.querySelectorAll<HTMLElement>(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    )
                ).filter((n) => !n.hasAttribute("disabled"));
                if (nodes.length === 0) return;

                const first = nodes[0];
                const last = nodes[nodes.length - 1];
                const active = document.activeElement as HTMLElement | null;

                if (e.shiftKey) {
                    if (!active || active === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (active === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };

        window.addEventListener("keydown", onKey);
        return () => {
            clearTimeout(t);
            window.removeEventListener("keydown", onKey);
        };
    }, [open, canClose, onClose]);

    // drag-to-close (mobile)
    const dragRef = useRef<{ y0: number; dy: number; dragging: boolean } | null>(null);
    const [dragY, setDragY] = useState(0);

    const onPointerDown = (e: React.PointerEvent) => {
        if (!isMobile) return;
        if (!canClose) return;
        dragRef.current = { y0: e.clientY, dy: 0, dragging: true };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isMobile) return;
        const st = dragRef.current;
        if (!st?.dragging) return;
        const dy = Math.max(0, e.clientY - st.y0);
        st.dy = dy;
        setDragY(dy);
    };

    const onPointerUp = () => {
        if (!isMobile) return;
        const st = dragRef.current;
        if (!st?.dragging) return;

        const dy = st.dy || 0;
        dragRef.current = null;

        if (dy > 120 && canClose) {
            onClose();
            setDragY(0);
            return;
        }

        // snap back
        setDragY(0);
    };

    const confirmLabel = confirmText || "Confirmer";
    const cancelLabel = cancelText || "Annuler";

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200]">
            {/* Backdrop */}
            <div
                className={[
                    "absolute inset-0 bg-stone-900/55 backdrop-blur-sm transition-opacity",
                    mounted ? "opacity-100" : "opacity-0",
                ].join(" ")}
                onClick={() => {
                    if (!canClose) return;
                    onClose();
                }}
            />

            {/* Layout wrapper */}
            <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                {/* Sheet / Dialog */}
                <div
                    ref={sheetRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    className={[
                        "relative w-full sm:max-w-md",
                        "bg-white border border-stone-200 shadow-2xl",
                        "sm:rounded-3xl overflow-hidden",
                        // mobile round only top corners
                        "rounded-t-3xl sm:rounded-3xl",
                        "transform transition",
                    ].join(" ")}
                    style={{
                        transform: isMobile
                            ? `translateY(${dragY}px)`
                            : undefined,
                    }}
                >
                    {/* Ambient */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className={["absolute -top-20 -left-20 h-60 w-60 rounded-full blur-3xl", palette.glowA].join(" ")} />
                        <div className={["absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl", palette.glowB].join(" ")} />
                        <div className="absolute inset-0 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                    </div>

                    {/* Drag handle (mobile) */}
                    <div className="relative sm:hidden px-4 pt-3">
                        <div
                            className={[
                                "mx-auto h-1.5 w-12 rounded-full bg-stone-300/70",
                                canClose ? "cursor-grab active:cursor-grabbing" : "opacity-50",
                            ].join(" ")}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                        />
                    </div>

                    {/* Header */}
                    <div className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-stone-100 bg-white/75 backdrop-blur">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase shadow-sm bg-white">
                  <span className={["inline-flex items-center gap-2", palette.chipText].join(" ")}>
                    {defaultIcon}
                      {effectiveTone === "danger" ? "Action sensible" : "Confirmation"}
                  </span>
                                </div>

                                <div className="mt-2 text-lg sm:text-xl font-serif text-stone-900 leading-snug">
                                    {title}
                                </div>

                                {description ? (
                                    <div className="mt-1 text-sm text-stone-500 leading-relaxed">
                                        {description}
                                    </div>
                                ) : null}
                            </div>

                            {showCloseButton ? (
                                <button
                                    onClick={() => {
                                        if (!canClose) return;
                                        onClose();
                                    }}
                                    className={[
                                        "shrink-0 rounded-xl p-2 transition text-stone-600",
                                        canClose ? "hover:bg-stone-100" : "opacity-40 cursor-not-allowed",
                                        "focus-visible:outline-none focus-visible:ring-4",
                                        palette.ring,
                                    ].join(" ")}
                                    aria-label="Fermer"
                                >
                                    <X size={18} />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="relative px-4 sm:px-6 py-4">
                        <div className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                            <div className={["h-10 w-10 rounded-2xl border flex items-center justify-center", palette.iconWrap].join(" ")}>
                                {defaultIcon}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-stone-900">
                                    {effectiveTone === "danger" ? "Êtes-vous sûr ?" : "Confirmer l’action"}
                                </div>
                                <div className="mt-0.5 text-xs text-stone-500">
                                    {effectiveTone === "danger"
                                        ? "Cette action peut être irréversible."
                                        : "Vous pouvez annuler si vous changez d’avis."}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="relative px-4 sm:px-6 pb-4 sm:pb-6">
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                            <button
                                onClick={() => {
                                    if (!canClose) return;
                                    onClose();
                                }}
                                className={[
                                    "w-full sm:w-auto px-4 py-3 rounded-2xl border text-sm font-semibold transition",
                                    "border-stone-200 bg-white hover:bg-stone-50 text-stone-800",
                                    "focus-visible:outline-none focus-visible:ring-4",
                                    palette.ring,
                                    loading ? "opacity-70 cursor-not-allowed" : "",
                                ].join(" ")}
                                disabled={!!loading}
                            >
                                {cancelLabel}
                            </button>

                            <button
                                onClick={() => {
                                    if (loading) return;
                                    onConfirm();
                                }}
                                disabled={!!loading}
                                className={[
                                    "w-full sm:w-auto px-4 py-3 rounded-2xl text-sm font-bold text-white transition shadow-lg",
                                    palette.primaryBtn,
                                    "focus-visible:outline-none focus-visible:ring-4",
                                    palette.ring,
                                    loading ? "opacity-70 cursor-not-allowed" : "",
                                ].join(" ")}
                            >
                <span className="inline-flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loading ? "Traitement…" : confirmLabel}
                </span>
                            </button>
                        </div>

                        {confirmHint ? (
                            <div className="mt-3 text-center text-[11px] text-stone-500">
                                {confirmHint}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
