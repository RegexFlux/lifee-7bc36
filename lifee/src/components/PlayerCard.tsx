// components/lifee/PlayerCard.tsx
import React from "react";
import {
    ChevronDown,
    ChevronUp,
    Clock,
    Image as ImageIcon,
    Sparkles,
} from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";

export function PlayerCard(props: {
    videoUrl: string | null;
    thumbnailUrl: string | null;
    title: string;
    createdLabel: string;
    createdBy: string;
    progress: number; // 0..1
    statusText: string;
}) {
    const pct = Math.round(Math.max(0, Math.min(1, props.progress)) * 100);
    const hasThumb = Boolean(props.thumbnailUrl);
    const showThumbAsMain = !props.videoUrl && hasThumb;

    // ✅ infos sur le player repliables (le média reste “clean”)
    const [showInfoOnPlayer, setShowInfoOnPlayer] = React.useState(true);

    return (
        <div className="w-full relative">
            {/* Layout: player + "source" panel (thumbnail toujours visible) */}
            <div className="grid grid-cols-1 gap-6 items-start">
                {/* PLAYER */}
                <div className="rounded-3xl border border-stone-200 bg-white/70 shadow-2xl shadow-rose-100/40 backdrop-blur overflow-hidden">
                    <div className="relative aspect-video bg-stone-100 overflow-hidden">
                        {/* Media */}
                        {props.videoUrl ? (
                            <VideoPlayer videoUrl={props.videoUrl} />
                        ) : showThumbAsMain ? (
                            <>
                                <img
                                    loading="lazy"
                                    src={props.thumbnailUrl as string}
                                    alt="Photo d'origine"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-white/10" />
                                <div className="absolute inset-0 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="mx-auto h-12 w-12 rounded-2xl border border-stone-200 bg-white/70 shadow-sm backdrop-blur flex items-center justify-center">
                                        <Sparkles size={18} className="text-rose-500" />
                                    </div>
                                    <div className="mt-3 text-sm text-stone-600">
                                        Préparation de l’aperçu…
                                    </div>
                                    <div className="mt-1 text-[11px] font-mono text-stone-500">
                                        {props.statusText}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Toggle infos (sur le player uniquement) */}
                        <button
                            type="button"
                            onClick={() => setShowInfoOnPlayer((v) => !v)}
                            className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-xs text-stone-700 shadow-sm backdrop-blur hover:bg-white transition"
                            aria-label={showInfoOnPlayer ? "Masquer les infos" : "Afficher les infos"}
                        >
                            {showInfoOnPlayer ? (
                                <>
                                    <ChevronDown size={14} className="text-stone-600" />
                                    Masquer infos
                                </>
                            ) : (
                                <>
                                    <ChevronUp size={14} className="text-stone-600" />
                                    Afficher infos
                                </>
                            )}
                        </button>

                        {/* Overlay infos (bottom) */}
                        <div
                            className={[
                                "absolute left-0 right-0 bottom-0 p-6 transition-all duration-500",
                                showInfoOnPlayer
                                    ? "translate-y-0 opacity-100"
                                    : "translate-y-6 opacity-0 pointer-events-none",
                            ].join(" ")}
                        >
                            <div className="rounded-2xl border border-stone-200 bg-white/80 shadow-sm backdrop-blur p-4">
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-serif text-stone-900 leading-tight">
                                            {props.title}
                                        </h2>
                                        <p className="mt-1 text-xs text-stone-600 flex items-center gap-2 font-mono">
                                            <Clock size={14} className="text-rose-500" />
                                            {props.createdLabel} par{" "}
                                            <span className="text-stone-900 font-semibold">
                        {props.createdBy}
                      </span>
                                        </p>
                                        <p className="mt-1 text-[11px] text-stone-500 font-mono">
                                            {props.statusText}
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                    <span className="px-2 py-1 rounded-full border border-stone-200 bg-white text-[10px] uppercase font-bold tracking-wider text-stone-700">
                      HD
                    </span>
                                        <span className="px-2 py-1 rounded-full border border-stone-200 bg-white text-[10px] uppercase font-bold tracking-wider text-stone-700 tabular-nums">
                      {pct}%
                    </span>
                                    </div>
                                </div>

                                <div className="mt-4 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-rose-400 to-amber-300"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {hasThumb ? (
                    <svg
                        className="pointer-events-none mx-auto rotate-90 h-16 w-20 opacity-70"
                        viewBox="0 0 120 80"
                        fill="none"
                        aria-hidden="true"
                    >
                        {/* courbe vers la gauche (vers le player) */}
                        <path
                            d="M110,12 C78,18 62,34 46,52 C34,66 24,72 10,74"
                            stroke="currentColor"
                            className="text-stone-500"
                            strokeWidth="2"
                            strokeDasharray="6 4"
                            strokeLinecap="round"
                        />
                        {/* flèche */}
                        <path
                            d="M16 66 L6 74 L18 78"
                            stroke="currentColor"
                            className="text-stone-500"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                ) : null}
                {/* SOURCE PANEL (thumbnail TOUJOURS affiché si disponible) */}
                <div className="relative">

                    <div className="rounded-3xl border border-stone-200 bg-white/70 shadow-sm backdrop-blur p-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-3 py-1 text-xs text-stone-700 shadow-sm backdrop-blur">
                            <ImageIcon size={14} className="text-rose-500" />
                            Photo d’origine
                        </div>

                        <div className="mt-3 rounded-2xl border border-stone-200 bg-white overflow-hidden">
                            {hasThumb ? (
                                <img
                                    loading="lazy"
                                    src={props.thumbnailUrl as string}
                                    alt="Photo d'origine"
                                    className="w-full h-40 object-cover"
                                />
                            ) : (
                                <div className="h-40 flex items-center justify-center bg-stone-50">
                                    <div className="text-center">
                                        <div className="mx-auto h-10 w-10 rounded-2xl border border-stone-200 bg-white flex items-center justify-center">
                                            <ImageIcon size={16} className="text-stone-400" />
                                        </div>
                                        <div className="mt-2 text-xs text-stone-500">
                                            Aucune image source
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ✅ Quand on replie sur le player, on “range” les infos ici */}
                        {!showInfoOnPlayer ? (
                            <div className="mt-4 rounded-2xl border border-stone-200 bg-white/80 p-3">
                                <div className="text-sm font-semibold text-stone-900">
                                    {props.title}
                                </div>
                                <div className="mt-1 text-[11px] font-mono text-stone-500">
                                    {props.createdLabel} • {props.createdBy}
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="text-[11px] font-mono text-stone-500">
                                        {props.statusText}
                                    </div>
                                    <div className="text-[11px] font-mono text-stone-600 tabular-nums">
                                        {pct}%
                                    </div>
                                </div>

                                <div className="mt-3 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-rose-400 to-amber-300"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 text-[11px] font-mono text-stone-500">
                                {props.videoUrl
                                    ? "Résultat en cours de lecture"
                                    : "Cette photo sert de base à la génération"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
