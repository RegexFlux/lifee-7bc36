"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import {Download, ExternalLink, Film, Sparkles, X, Zap, CheckCircle2, Crown} from "lucide-react";
import {useRouter} from "next/router";
import {AnimatePresence, motion} from "framer-motion";
import {EmailSharePopover} from "@/components/EmailSharePopover";

/** Packs: lumineux, simples, “sale ready” */
type PackTier = "standard" | "creator";
export type Pack = {
    id: string;
    tier: PackTier;
    name: string;
    subtitle: string;
    credits: number;
    priceEur: number;
    badge?: string;
    highlight?: boolean;
    includedExtraCredits?: number;
    benefits: string[];
};

const DEFAULT_PACKS: Pack[] = [
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

/** Mobile detection (safe SSR). Mostly used for behavior; layout is CSS-responsive. */
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
    studioPath?: string; // ex: "/studio"
    onGoToStudio?: () => void; // override si tu veux
}) {
    const router = useRouter();
    const {mounted, isMobile} = useIsMobile();

    const [open, setOpen] = useState(false);
    const openedForRef = useRef<string | null>(null);

    // ✅ ouvre automatiquement à chaque nouvelle vidéo (pas juste "une fois" globalement)
    useEffect(() => {
        if (!params.videoUrl) return;
        if (openedForRef.current === params.videoUrl) return;
        openedForRef.current = params.videoUrl;
        setOpen(true);
    }, [params.videoUrl]);

    const close = () => setOpen(false);

    const goToStudio = async () => {
        if (params.onGoToStudio) return params.onGoToStudio();
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
    const {pack} = props;

    return (
        <button
            type="button"
            onClick={() => props.onPick?.(pack.id)}
            className={[
                "group relative text-left rounded-2xl border p-3 transition",
                pack.highlight
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
                    <div className="mt-0.5 text-[11px] text-slate-500">{pack.subtitle}</div>
                </div>

                <div className="shrink-0 text-right">
                    <div className="text-sm font-black text-slate-900">{pack.priceEur}€</div>
                    <div className="text-[10px] text-slate-500">{pack.credits} crédits</div>
                </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
                {pack.benefits.slice(0, 3).map((b) => (
                    <span
                        key={b}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                    >
            {b}
          </span>
                ))}
            </div>

            {pack.tier === "creator" ? (
                <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-rose-700">
                    <Crown size={14}/>
                    1080p + rendu amélioré
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

    /** Optional: ouvrir ta modal crédits / pricing */
    onOpenCredits?: () => void;

    /** Optional: packs source-of-truth depuis ta CreditModal */
    packs?: Pack[];
}>) {
    const packs = props.packs ?? DEFAULT_PACKS;

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [muted, setMuted] = useState(true);

    // ESC + lock scroll + autoplay best-effort when open
    useEffect(() => {
        if (!props.open) return;

        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") props.onClose();
        };
        window.addEventListener("keydown", onKey);

        const t = window.setTimeout(() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = true; // ✅ maximise les chances d’autoplay
            setMuted(true);
            v.play().catch(() => {
                // blocked => controls natifs + bouton play utilisateur
            });
        }, 60);

        return () => {
            window.clearTimeout(t);
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

    const featureBullets = useMemo(
        () => [
            {
                icon: <Sparkles size={16} className="text-rose-600"/>,
                title: "1080p",
                desc: "Export plus net, prêt à partager."
            },
            {
                icon: <Zap size={16} className="text-amber-600"/>,
                title: "Plus stable",
                desc: "Modèle plus réaliste, moins d’artefacts."
            },
            {
                icon: <CheckCircle2 size={16} className="text-emerald-600"/>,
                title: "Restauration",
                desc: "Couleurs + détails améliorés, contexte mieux compris."
            },
        ],
        []
    );

    const pickPack = (packId: string) => {
        // ⚡️ tu peux ouvrir une modal crédits, ou rediriger vers un écran pricing
        if (props.onOpenCredits) return props.onOpenCredits();

        // fallback “safe” si tu n’as pas encore branché la modal
        // (évite de forcer email/checkout ici)
        props.onGoToStudio();
    };

    return (
        <AnimatePresence>
            {props.open ? (
                <div className="fixed inset-0 z-[90]">
                    {/* Backdrop */}
                    <motion.button
                        type="button"
                        aria-label="Fermer l’aperçu"
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
                            aria-label="Aperçu vidéo"
                            className={[
                                "relative w-full overflow-hidden bg-white border border-slate-200 shadow-2xl",
                                "sm:max-w-5xl sm:rounded-3xl",
                                "rounded-t-3xl sm:rounded-3xl",
                                "max-h-[92vh] sm:h-[90vh] overflow-scroll",
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
                                                Votre souvenir est prêt
                                            </div>
                                            <div
                                                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700">
                                                <Sparkles size={12}/>
                                                Essai gratuit
                                            </div>
                                        </div>

                                        <div className="mt-2 text-sm font-black text-slate-900">Aperçu plein écran</div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            Pour aller plus loin : <span
                                            className="font-semibold text-slate-700">1080p</span>, rendu plus réaliste,
                                            restauration des couleurs & accès au studio.
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                        {props.jobId ?
                                            <EmailSharePopover jobId={props.jobId} size="md" label="Envoyer"/> : null}

                                        <button
                                            onClick={props.onClose}
                                            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200"
                                            aria-label="Fermer"
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
                                            {/* soft vignette */}
                                            <div
                                                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10"/>
                                        </div>

                                        <div
                                            className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        const v = videoRef.current;
                                                        if (!v) return;
                                                        const next = !muted;
                                                        setMuted(next);
                                                        v.muted = next;
                                                        if (!next) v.play().catch(() => {
                                                        });
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50"
                                                >
                                                    <span className="h-2 w-2 rounded-full bg-slate-900/70"/>
                                                    {muted ? "Activer le son" : "Couper le son"}
                                                </button>

                                                {props.shareUrl ? (
                                                    <a
                                                        href={props.shareUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-slate-500 hover:text-slate-700 underline"
                                                    >
                                                        Ouvrir le lien de partage
                                                    </a>
                                                ) : null}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={props.onDownload}
                                                    className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 flex items-center justify-center gap-2"
                                                >
                                                    <Download size={18}/>
                                                    Télécharger
                                                </button>

                                                <button
                                                    onClick={props.onGoToStudio}
                                                    className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 text-sm font-black hover:bg-slate-50 flex items-center justify-center gap-2"
                                                >
                                                    <ExternalLink size={18} className="text-rose-600"/>
                                                    Studio
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
                                                    <div className="text-sm font-black text-slate-900">Passez au niveau
                                                        Studio
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        <span
                                                            className="font-semibold text-slate-700">connexion</span> →
                                                        accès immédiat au studio, export 1080p et rendu amélioré.
                                                    </div>
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
                                                <div className="text-xs font-black text-slate-900">Choisissez un pack
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={props.onOpenCredits}
                                                    className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 underline"
                                                >
                                                    Voir tous les packs
                                                </button>
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 gap-2">
                                                {/* ultra-concis : montre surtout ce qui “convertit” */}
                                                {packs
                                                    .filter((p) => p.tier === "creator" || p.highlight)
                                                    .slice(0, 3)
                                                    .map((p) => (
                                                        <PackPill key={p.id} pack={p} onPick={pickPack}/>
                                                    ))}
                                            </div>

                                            <button
                                                onClick={props.onGoToStudio}
                                                className="mt-3 w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white text-sm font-black hover:opacity-[0.98] active:scale-[0.99] transition"
                                            >
                                                Déverrouiller le Studio (connexion → accès immédiat)
                                            </button>

                                            <div className="mt-2 text-[11px] text-slate-500">
                                                Astuce : votre essai est parfait pour découvrir. Le Studio sert à <span
                                                className="font-semibold text-slate-700">améliorer</span> et <span
                                                className="font-semibold text-slate-700">finaliser</span> (1080p,
                                                stabilité, restauration).
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer mobile hint */}
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
