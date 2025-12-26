// File: src/hooks/useVideoResultModal.tsx
"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {
    CheckCircle2,
    Crown,
    Download,
    ExternalLink,
    Film,
    Loader2,
    Sparkles,
    X,
    Zap,
} from "lucide-react";
import {useRouter} from "next/router";

import {useT} from "@/lib/i18n/useT";
import {EmailSharePopover} from "@/components/EmailSharePopover";
import {AlbumSimpleLauncher, ensureGuestSession} from "@/components/album/AlbumSimpleLauncher";
import {fetchUser} from "@/components/studio/StudioApp";

/** Aligné avec credit_packs (table) */
export type PackTier = "standard" | "creator";
export type Pack = {
    id: string;
    tier: PackTier;
    name: string;
    subTitle: string;
    credits: number;
    priceEur: number;
    badge?: string | null;
    benefits: string[];
};

function useIsMobile(max = 640) {
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setMounted(true);
        const update = () => {
            try {
                setIsMobile(window.matchMedia(`(max-width: ${max}px)`).matches);
            } catch {
                setIsMobile(false);
            }
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [max]);

    return {mounted, isMobile};
}

export function useVideoResultModal(params: {
    videoUrl: string | null;
    shareUrl?: string | null;
    onDownloadClick: () => void;
    studioPath?: string;
    onGoToStudio?: () => void;
}) {
    const router = useRouter();
    const {mounted, isMobile} = useIsMobile();

    const [open, setOpen] = useState(false);
    const openedForRef = useRef<string | null>(null);

    // ✅ auto-open sur chaque nouvelle vidéo (pas “une fois” globalement)
    useEffect(() => {
        if (!params.videoUrl) return;
        if (openedForRef.current === params.videoUrl) return;
        openedForRef.current = params.videoUrl;
        setOpen(true);
    }, [params.videoUrl]);

    const close = () => setOpen(false);

    const goToStudio = async () => {
        if (params.onGoToStudio) return params.onGoToStudio();

        // On reste permissif: si fetchUser fail -> ensureGuestSession (au cas où)
        try {
            await fetchUser();
        } catch {
            await ensureGuestSession();
        }

        const path = params.studioPath || "/studio";
        await router.push(path);
    };

    const download = () => params.onDownloadClick();

    return {
        open,
        setOpen,
        close,
        download,
        goToStudio,
        mounted,
        isMobile,
        shareUrl: params.shareUrl ?? null,
        videoUrl: params.videoUrl,
    };
}

function PackPill(props: {
    pack: Pack;
    onPick?: (id: string) => void;
}) {
    const {t} = useT();
    const {pack} = props;

    return (
        <button
            type="button"
            onClick={() => props.onPick?.(pack.id)}
            className={[
                "group relative text-left rounded-2xl border p-3 transition",
                pack.tier === "creator"
                    ? "border-rose-200 bg-gradient-to-b from-rose-50 to-white shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-black text-slate-900">{pack.name}</div>
                        {pack.badge ? (
                            <span
                                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {pack.badge}
              </span>
                        ) : null}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{pack.subTitle}</div>
                </div>

                <div className="shrink-0 text-right">
                    <div className="text-sm font-black text-slate-900">{pack.priceEur}€</div>
                    <div className="text-[10px] text-slate-500">
                        {pack.credits} {t("credits.label")}
                    </div>
                </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
                {pack.benefits.slice(0, 3).map((b, idx) => (
                    <span
                        key={`${pack.id}:${idx}`}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                    >
            {b}
          </span>
                ))}
            </div>

            {pack.tier === "creator" ? (
                <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-rose-700">
                    <Crown size={14}/>
                    {t("videoModal.creatorHint")}
                </div>
            ) : null}

            <div
                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent group-hover:ring-slate-300/50 transition"/>
        </button>
    );
}

export function VideoResultModal(props: Readonly<{
    jobId: string | null;
    open: boolean;
    mounted: boolean;
    isMobile: boolean;

    videoUrl: string;
    shareUrl?: string | null;

    onClose: () => void;
    onDownload: () => void;
    onGoToStudio: () => void;

    onOpenCredits?: () => void;
    packs?: Pack[];
}>) {
    const reduce = useReducedMotion();
    const {t} = useT();

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [muted, setMuted] = useState(true);
    const [autoPlayTried, setAutoPlayTried] = useState(false);

    // Scroll lock + ESC + autoplay best-effort (clean)
    useEffect(() => {
        if (!props.open) return;

        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") props.onClose();
        };
        window.addEventListener("keydown", onKey);

        const tt = window.setTimeout(() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = true;
            setMuted(true);
            setAutoPlayTried(true);
            v.play().catch(() => {
                // autoplay bloqué => controls restent, UX OK
            });
        }, 60);

        return () => {
            window.clearTimeout(tt);
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
            setAutoPlayTried(false);
        };
    }, [props.open, props.onClose]);

    const featureBullets = useMemo(
        () => [
            {
                icon: <Sparkles size={16} className="text-rose-600"/>,
                title: t("videoModal.features.1080.title"),
                desc: t("videoModal.features.1080.desc"),
            },
            {
                icon: <Zap size={16} className="text-amber-600"/>,
                title: t("videoModal.features.stable.title"),
                desc: t("videoModal.features.stable.desc"),
            },
            {
                icon: <CheckCircle2 size={16} className="text-emerald-600"/>,
                title: t("videoModal.features.restore.title"),
                desc: t("videoModal.features.restore.desc"),
            },
        ],
        [t]
    );

    const packs = props.packs ?? [];

    const pickPack = () => {
        // simple: soit tu ouvres ta modal crédits, soit tu vas au studio
        if (props.onOpenCredits) return props.onOpenCredits();
        props.onGoToStudio();
    };

    const openShare = () => {
        if (!props.shareUrl) return;
        window.open(props.shareUrl, "_blank", "noreferrer");
    };

    return (
        <AnimatePresence>
            {props.open ? (
                <div className="fixed inset-0 z-[90]">
                    {/* Backdrop */}
                    <motion.button
                        type="button"
                        aria-label={t("videoModal.closeAria")}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={props.onClose}
                        initial={{opacity: 0}}
                        animate={{opacity: props.mounted ? 1 : 0}}
                        exit={{opacity: 0}}
                    />

                    {/* Layout */}
                    <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label={t("videoModal.dialogAria")}
                            className={[
                                "relative w-full overflow-hidden bg-white border border-slate-200 shadow-2xl",
                                "sm:max-w-5xl sm:rounded-3xl",
                                "rounded-t-3xl sm:rounded-3xl",
                                "max-h-[92vh] sm:h-[90vh]",
                                // ✅ scroll propre: header/footer fixes, body scroll
                                "flex flex-col",
                            ].join(" ")}
                            initial={reduce ? {opacity: 0} : {y: 18, opacity: 0, scale: 0.99}}
                            animate={reduce ? {opacity: 1} : {y: 0, opacity: 1, scale: 1}}
                            exit={reduce ? {opacity: 0} : {y: 18, opacity: 0, scale: 0.99}}
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
                                                {t("videoModal.pillReady")}
                                            </div>
                                            <div
                                                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700">
                                                <Sparkles size={12}/>
                                                {t("videoModal.pillFreeTrial")}
                                            </div>
                                        </div>

                                        <div className="mt-2 text-sm font-black text-slate-900">
                                            {t("videoModal.title")}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {t("videoModal.subtitle")}
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                        {props.jobId ? (
                                            <EmailSharePopover jobId={props.jobId} size="md"
                                                               label={t("videoModal.emailCta")}/>
                                        ) : null}

                                        <button
                                            onClick={props.onClose}
                                            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200"
                                            aria-label={t("videoModal.close")}
                                            type="button"
                                        >
                                            <X size={18} className="text-slate-600"/>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Body (scroll) */}
                            <div className="flex-1 overflow-auto p-3 sm:p-5">
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
                                            {!autoPlayTried ? (
                                                <div
                                                    className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-[11px] text-white/85 backdrop-blur">
                                                    {t("videoModal.autoplayHint")}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div
                                            className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                                            <div className="flex flex-col items-center gap-2">
                                                {props.shareUrl ? (
                                                    <button
                                                        type="button"
                                                        onClick={openShare}
                                                        className="text-base text-slate-500 hover:text-slate-700 underline"
                                                    >
                                                        {t("videoModal.openShare")}
                                                    </button>
                                                ) : null}

                                                <AlbumSimpleLauncher/>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={props.onDownload}
                                                    className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 flex items-center justify-center gap-2"
                                                    type="button"
                                                >
                                                    <Download size={18}/>
                                                    {t("videoModal.download")}
                                                </button>

                                                <button
                                                    onClick={props.onGoToStudio}
                                                    className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 text-sm font-black hover:bg-slate-50 flex items-center justify-center gap-2"
                                                    type="button"
                                                >
                                                    <ExternalLink size={18} className="text-rose-600"/>
                                                    {t("videoModal.studio")}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Upgrade / Value */}
                                    <div
                                        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                        <div
                                            className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div
                                                        className="text-sm font-black text-slate-900">{t("videoModal.upgradeTitle")}</div>
                                                    <div
                                                        className="mt-1 text-xs text-slate-500">{t("videoModal.upgradeDesc")}</div>
                                                </div>
                                                <div
                                                    className="shrink-0 grid h-9 w-9 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
                                                    <Crown size={16}/>
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {featureBullets.map((f) => (
                                                    <div key={f.title}
                                                         className="rounded-2xl border border-slate-200 bg-white p-3">
                                                        <div className="flex items-center gap-2">
                                                            {f.icon}
                                                            <div
                                                                className="text-xs font-black text-slate-900">{f.title}</div>
                                                        </div>
                                                        <div
                                                            className="mt-1 text-[11px] text-slate-500 leading-snug">{f.desc}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <div
                                                    className="text-xs font-black text-slate-900">{t("videoModal.choosePack")}</div>
                                                {props.onOpenCredits ? (
                                                    <button
                                                        type="button"
                                                        onClick={props.onOpenCredits}
                                                        className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 underline"
                                                    >
                                                        {t("videoModal.viewAllPacks")}
                                                    </button>
                                                ) : null}
                                            </div>

                                            {packs.length ? (
                                                <div className="mt-3 grid grid-cols-1 gap-2">
                                                    {packs
                                                        .filter((p) => p.tier === "creator" || p.badge)
                                                        .slice(0, 3)
                                                        .map((p) => (
                                                            <PackPill key={p.id} pack={p} onPick={pickPack}/>
                                                        ))}
                                                </div>
                                            ) : (
                                                <div
                                                    className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                                    {t("videoModal.noPacksHint")}
                                                </div>
                                            )}

                                            <button
                                                onClick={props.onGoToStudio}
                                                className="mt-3 w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white text-sm font-black hover:opacity-[0.98] active:scale-[0.99] transition"
                                                type="button"
                                            >
                                                {t("videoModal.unlockCta")}
                                            </button>

                                            <div
                                                className="mt-2 text-[11px] text-slate-500">{t("videoModal.footerTip")}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer mobile hint */}
                            <div
                                className="p-4 sm:hidden border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 text-center">
                                {t("videoModal.mobileHint")}
                            </div>
                        </motion.div>
                    </div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}