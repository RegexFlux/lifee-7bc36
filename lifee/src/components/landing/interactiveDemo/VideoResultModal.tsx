// File: src/components/VideoResultModal.tsx
"use client";

import React, {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {Download, ExternalLink, Film, X, Loader2, Bookmark, CheckCircle2, Sparkles} from "lucide-react";

import {useT} from "@/lib/i18n/useT";
import {useViewer} from "@/lib/auth/useViewer";
import {useAuthGate} from "@/hooks/useAuthGate";
import {EmailSharePopover} from "@/components/EmailSharePopover";
import {useRouter} from "next/router";

export function VideoResultModal(props: Readonly<{
    generationId: string | null;
    open: boolean;
    mounted: boolean;
    isMobile: boolean;

    shareUrl?: string | null;

    videoUrl: string;
    onClose: () => void;
    onDownload: () => void;
    onGoToStudio: () => void;
}>) {
    const {t} = useT();
    const router = useRouter();
    const {isGuest, refresh} = useViewer();
    const {requireLinked} = useAuthGate();

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [muted, setMuted] = useState(true);

    const [saving, setSaving] = useState(false);
    const [savedPing, setSavedPing] = useState(false);

    useEffect(() => {
        if (!props.open) return;

        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") props.onClose();
        };
        window.addEventListener("keydown", onKey);

        const tmr = window.setTimeout(() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = true;
            setMuted(true);
            v.play().catch(() => {
            });
        }, 60);

        return () => {
            window.clearTimeout(tmr);
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;

            const v = videoRef.current;
            if (v) {
                try {
                    v.pause();
                    v.currentTime = 0;
                } catch {
                }
            }
        };
    }, [props.open, props.onClose]);

    const saveNow = async () => {
        setSaving(true);
        try {
            const ok = await requireLinked("save");
            if (!ok) return;
            await refresh();
            setSavedPing(true);
            window.setTimeout(() => setSavedPing(false), 1200);
        } finally {
            setSaving(false);
        }
    };

    const goToSharePage = async () => {
        if (!props.shareUrl) console.log('no route');
        await router.push(props.shareUrl!);
    };

    return (
        <AnimatePresence>
            {props.open ? (
                <div className="fixed inset-0 z-[90]">
                    <motion.button
                        type="button"
                        aria-label="Close"
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={props.onClose}
                        initial={{opacity: 0}}
                        animate={{opacity: props.mounted ? 1 : 0}}
                        exit={{opacity: 0}}
                    />

                    <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className={[
                                "relative w-full overflow-hidden bg-white border border-slate-200 shadow-2xl",
                                "sm:max-w-5xl sm:rounded-3xl",
                                "rounded-t-3xl sm:rounded-3xl",
                                "max-h-[92vh] sm:h-[90vh] overflow-auto",
                            ].join(" ")}
                            initial={{y: 18, opacity: 0, scale: 0.99}}
                            animate={{y: 0, opacity: 1, scale: 1}}
                            exit={{y: 18, opacity: 0, scale: 0.99}}
                            transition={{type: "spring", stiffness: 420, damping: 34}}
                        >
                            {/* Header */}
                            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div
                                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                                                <Film size={12} className="text-rose-600"/>
                                                {t("videoModal.ready")}
                                            </div>

                                            {isGuest ? (
                                                <div
                                                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700">
                                                    <Sparkles size={12}/>
                                                    Guest
                                                </div>
                                            ) : (
                                                <div
                                                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                                                    <CheckCircle2 size={12}/>
                                                    {t("videoModal.saved")}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-2 text-sm font-black text-slate-900">Aperçu plein écran</div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {isGuest
                                                ? "Sauvegardez pour garder l’accès au partage et à l’export."
                                                : "Vous pouvez partager et exporter quand vous voulez."}
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                        {/* Share (gated inside) */}
                                        <EmailSharePopover generationId={props.generationId} size="md"
                                                           label={t("videoModal.share")}/>

                                        <button
                                            onClick={props.onClose}
                                            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200"
                                            aria-label="Close"
                                            type="button"
                                        >
                                            <X size={18} className="text-slate-600"/>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-3 sm:p-5">
                                <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4 lg:gap-5 items-start">
                                    {/* Video */}
                                    <div className="min-w-0">
                                        <div
                                            className="rounded-2xl border border-slate-200 overflow-hidden bg-black relative">
                                            <video
                                                ref={videoRef}
                                                src={props.videoUrl}
                                                className="w-full h-[46vh] sm:h-[58vh] object-contain bg-black"
                                                playsInline
                                                preload="metadata"
                                                muted={muted}
                                                controls
                                            />
                                            <div
                                                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10"/>
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <button
                                                onClick={props.onDownload}
                                                className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 flex items-center justify-center gap-2"
                                            >
                                                <Download size={18}/>
                                                {t("videoModal.download")}
                                            </button>

                                            <button
                                                onClick={props.onGoToStudio}
                                                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 text-sm font-black hover:bg-slate-50 flex items-center justify-center gap-2"
                                            >
                                                <ExternalLink size={18} className="text-rose-600"/>
                                                {t("videoModal.studio")}
                                            </button>

                                            <button
                                                onClick={goToSharePage}
                                                className="px-4 py-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 text-sm font-black hover:bg-rose-100 flex items-center justify-center gap-2"
                                            >
                                                <ExternalLink size={18}/>
                                                {t("videoModal.exportCta")}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Save CTA */}
                                    <div
                                        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                        <div
                                            className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
                                            <div className="text-sm font-black text-slate-900">
                                                {isGuest ? "Ne perdez pas vos avancées" : "Compte lié"}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {isGuest
                                                    ? "Associez un email (30 sec) pour sécuriser ce souvenir et exporter plus tard."
                                                    : "Vous pouvez partager/exporter à tout moment."}
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            {isGuest ? (
                                                <button
                                                    onClick={saveNow}
                                                    disabled={saving}
                                                    className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white text-sm font-black hover:opacity-[0.98] active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-60"
                                                >
                                                    {saving ? <Loader2 size={18} className="animate-spin"/> :
                                                        <Bookmark size={18}/>}
                                                    {t("videoModal.saveCta")}
                                                </button>
                                            ) : (
                                                <div
                                                    className="w-full px-4 py-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-black flex items-center justify-center gap-2">
                                                    <CheckCircle2 size={18}/>
                                                    {t("videoModal.saved")}
                                                </div>
                                            )}

                                            {savedPing ? (
                                                <div className="mt-3 text-[11px] font-semibold text-emerald-700">
                                                    {t("videoModal.saved")}
                                                </div>
                                            ) : (
                                                <div className="mt-3 text-[11px] text-slate-500">
                                                    Astuce : partage & export seront toujours disponibles après
                                                    sauvegarde.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="p-4 sm:hidden border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 text-center">
                                Astuce : touchez le fond pour fermer.
                            </div>
                        </motion.div>
                    </div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}
