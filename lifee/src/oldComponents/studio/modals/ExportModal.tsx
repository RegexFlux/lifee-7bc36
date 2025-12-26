"use client";

// src/components/studio/ExportModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Download,
    Loader2,
    Play,
    Share2,
    X,
    Sparkles,
    Film,
    Music2,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import type { MusicTrack } from "@/types/studio";

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function ExportModal(props: {
    open: boolean;
    step: "idle" | "rendering" | "done" | "error";
    progress: number; // 0..100
    audioTrack: MusicTrack | null;

    onClose: () => void;
    onDownload: () => void;
    onShare: () => void;
}) {
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const sheetRef = useRef<HTMLDivElement | null>(null);
    const lastActiveRef = useRef<HTMLElement | null>(null);

    // drag-to-close (mobile)
    const dragRef = useRef<{ y0: number; dy: number; dragging: boolean } | null>(null);
    const [dragY, setDragY] = useState(0);

    useEffect(() => {
        setMounted(true);
        const update = () => {
            try {
                setIsMobile(window.matchMedia("(max-width: 640px)").matches);
            } catch {
                setIsMobile(false);
            }
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // body scroll lock + focus restore
    useEffect(() => {
        if (!props.open) return;
        lastActiveRef.current = document.activeElement as HTMLElement | null;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
            lastActiveRef.current?.focus?.();
        };
    }, [props.open]);

    // ESC
    useEffect(() => {
        if (!props.open) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") props.onClose();
        };
        window.addEventListener("keydown", onKey);

        // focus first element
        const t = setTimeout(() => {
            const el = sheetRef.current;
            if (!el) return;
            const first = el.querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            first?.focus();
        }, 60);

        return () => {
            clearTimeout(t);
            window.removeEventListener("keydown", onKey);
        };
    }, [props.open, props.onClose]);

    const p = clamp(props.progress ?? 0, 0, 100);

    const headline = useMemo(() => {
        if (props.step === "rendering") return "Votre film prend vie…";
        if (props.step === "done") return "Votre film est prêt ✨";
        if (props.step === "error") return "Oups… le rendu a échoué";
        return "Exporter";
    }, [props.step]);

    const sub = useMemo(() => {
        if (props.step === "rendering") return "On assemble vos souvenirs, on harmonise les couleurs, puis on finalise en HD.";
        if (props.step === "done") return "Téléchargez-le en HD ou partagez-le en un clic.";
        if (props.step === "error") return "Une erreur est survenue pendant le rendu. Réessayez dans un instant.";
        return "Lancez le rendu quand vous êtes prêt.";
    }, [props.step]);

    const close = () => props.onClose();

    const onPointerDown = (e: React.PointerEvent) => {
        if (!isMobile) return;
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

        if (dy > 120) {
            close();
            setDragY(0);
            return;
        }
        setDragY(0);
    };

    if (!props.open) return null;

    const accentGradient =
        "linear-gradient(90deg, rgba(251,113,133,0.95), rgba(245,158,11,0.95))";

    return (
        <div className="fixed inset-0 z-[80]">
            {/* Backdrop */}
            <div
                className={[
                    "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity",
                    mounted ? "opacity-100" : "opacity-0",
                ].join(" ")}
                onClick={close}
            />

            {/* Wrapper */}
            <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div
                    ref={sheetRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Exporter"
                    className={[
                        "relative w-full sm:max-w-lg",
                        "rounded-t-3xl sm:rounded-3xl overflow-hidden",
                        "bg-white border border-slate-200 shadow-2xl",
                        // animation type ConfirmDialog
                        isMobile ? "animate-in slide-in-from-bottom-8 duration-200" : "animate-in zoom-in-95 duration-200",
                    ].join(" ")}
                    style={{
                        transform: isMobile ? `translateY(${dragY}px)` : undefined,
                    }}
                >
                    {/* Drag handle (mobile) */}
                    <div className="sm:hidden px-4 pt-3">
                        <div
                            className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 cursor-grab active:cursor-grabbing"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                        />
                    </div>

                    {/* Header (ConfirmDialog-like) */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                                    <Sparkles size={12} className="text-amber-500" />
                                    Export • 1080p
                                </div>

                                <div className="mt-3 text-sm font-black text-slate-900">{headline}</div>
                                <div className="mt-1 text-xs text-slate-500 leading-relaxed">{sub}</div>
                            </div>

                            <button
                                onClick={close}
                                className="shrink-0 p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200"
                                aria-label="Fermer"
                            >
                                <X size={18} className="text-slate-600" />
                            </button>
                        </div>

                        {/* Specs row */}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Film size={16} className="text-rose-500" />
                                    <span className="text-[11px] font-semibold">Qualité</span>
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">1080p • 60fps</div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Music2 size={16} className="text-amber-500" />
                                    <span className="text-[11px] font-semibold">Audio</span>
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                                    {props.audioTrack ? props.audioTrack.title : "Sans audio"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-5">
                        {props.step === "rendering" ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div
                                                className="absolute inset-0 rounded-2xl blur-xl opacity-30"
                                                style={{ backgroundImage: accentGradient }}
                                            />
                                            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                                                <Loader2 className="animate-spin text-slate-900" size={20} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">Rendu en cours…</div>
                                            <div className="text-xs text-slate-500">
                                                Stabilisation • Colorimétrie • Export
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-lg font-bold text-slate-900 tabular-nums">{Math.round(p)}%</div>
                                        <div className="text-[11px] text-slate-400">temps variable</div>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="mt-4">
                                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${p}%`,
                                                backgroundImage: accentGradient,
                                                boxShadow:
                                                    "0 0 18px rgba(251,113,133,0.25), 0 0 18px rgba(245,158,11,0.18)",
                                            }}
                                        />
                                    </div>

                                    <div className="mt-3 flex justify-between text-[11px] text-slate-400">
                                        <span className={p >= 10 ? "text-slate-700 font-semibold" : ""}>Préparation</span>
                                        <span className={p >= 45 ? "text-slate-700 font-semibold" : ""}>Assemblage</span>
                                        <span className={p >= 80 ? "text-slate-700 font-semibold" : ""}>Finalisation</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Rendu sécurisé • données privées
                                </div>
                            </div>
                        ) : props.step === "done" ? (
                            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                                {/* Preview */}
                                <div className="relative aspect-video bg-slate-950">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                                    <div className="absolute inset-0 opacity-[0.12] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="relative">
                                            <div className="absolute inset-0 rounded-full bg-white/20 blur-xl" />
                                            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur">
                                                <Play size={22} className="text-white fill-white opacity-90" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                                        <CheckCircle2 size={14} className="text-emerald-300" />
                                        Export terminé
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={props.onShare}
                                            className="py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-semibold flex items-center justify-center gap-2"
                                        >
                                            <Share2 size={18} />
                                            Partager
                                        </button>

                                        <button
                                            onClick={props.onDownload}
                                            className="py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
                                            style={{
                                                backgroundImage: accentGradient,
                                                boxShadow:
                                                    "0 18px 45px -30px rgba(251,113,133,0.55), 0 18px 45px -30px rgba(245,158,11,0.45)",
                                            }}
                                        >
                                            <Download size={18} />
                                            Télécharger
                                        </button>
                                    </div>

                                    <div className="mt-3 text-center text-[11px] text-slate-500">
                                        Astuce : partagez un lien privé à votre famille, sans réseaux sociaux.
                                    </div>
                                </div>
                            </div>
                        ) : props.step === "error" ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                                    <AlertTriangle size={20} className="text-amber-600" />
                                </div>
                                <div className="text-sm font-black text-slate-900">Export échoué</div>
                                <div className="mt-2 text-xs text-slate-500">
                                    Une erreur est survenue pendant le rendu. Fermez et relancez l’export.
                                </div>
                                <button
                                    onClick={close}
                                    className="mt-4 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50"
                                >
                                    Fermer
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                                    <Sparkles size={20} className="text-rose-600" />
                                </div>
                                <div className="text-sm font-black text-slate-900">Exporter votre film</div>
                                <div className="mt-2 text-xs text-slate-500">Vérifiez votre musique, puis lancez le rendu.</div>
                            </div>
                        )}
                    </div>

                    {/* Footer (ConfirmDialog-like) */}
                    <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
                        <button
                            onClick={close}
                            className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-100"
                        >
                            Fermer
                        </button>

                        {props.step === "done" ? (
                            <button
                                onClick={props.onDownload}
                                className="px-3 py-2 rounded-xl text-sm font-bold text-white"
                                style={{ backgroundImage: accentGradient }}
                            >
                                Télécharger
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
