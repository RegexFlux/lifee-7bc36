// components/share/ConversionCard.tsx
import React, {useEffect, useMemo, useState} from "react";
import {Download, Lock, ShieldCheck, Heart, Clock, AlertTriangle} from "lucide-react";
import {CopyButton} from "@/components/share/CopyButton";

export function ConversionCard(
    props: Readonly<{
        canReplay: boolean;
        statusLine: string;
        progress: number;
        shareUrl: string;
        onUnlock: () => void;
        ctaLabel?: string;
        createdAt?: string | null;
        variant?: "dark" | "light";
    }>
) {
    const pct = Math.round(Math.max(0, Math.min(1, props.progress)) * 100);
    const variant = props.variant ?? "dark";

    // ⚠️ Ton code disait “24h” mais mettait 2h. Je rends ça configurable.
    const TTL_HOURS = Number(process.env.NEXT_PUBLIC_SHARE_TTL_HOURS ?? 2);
    const TTL_MS = Math.max(1, TTL_HOURS) * 60 * 60 * 1000;

    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const createdAtMs = useMemo(() => {
        if (!props.createdAt) return null;
        const t = Date.parse(props.createdAt);
        return Number.isFinite(t) ? t : null;
    }, [props.createdAt]);

    const expiresAtMs = useMemo(() => {
        if (createdAtMs == null) return null;
        return createdAtMs + TTL_MS;
    }, [createdAtMs, TTL_MS]);

    const timeLeftSec = useMemo(() => {
        if (expiresAtMs == null) return 0;
        const diffSec = Math.ceil((expiresAtMs - now) / 1000);
        return Math.max(0, diffSec);
    }, [expiresAtMs, now]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const isLight = variant === "light";

    return (
        <div className={isLight ? "space-y-6" : "space-y-8"}>
            {/* Hook */}
            <div
                className={
                    isLight
                        ? "rounded-2xl border border-stone-200 bg-white/70 shadow-sm backdrop-blur p-5 relative"
                        : "bg-slate-800/50 border border-white/10 p-5 rounded-2xl rounded-tl-sm relative shadow-xl backdrop-blur-sm w-full"
                }
            >
                <div
                    className={
                        isLight
                            ? "absolute -top-3 left-4 rounded-full border border-stone-200 bg-white px-3 py-1 text-[10px] font-bold text-stone-700 flex items-center gap-1 shadow-sm"
                            : "absolute -top-3 -left-1 bg-indigo-600 text-[10px] font-bold px-3 py-1 rounded-full text-white flex items-center gap-1 shadow-lg"
                    }
                >
                    <ShieldCheck size={10} className={isLight ? "text-rose-500" : "text-white"}/>
                    Aperçu privé
                </div>

                <p className={isLight ? "text-stone-700 text-sm leading-relaxed mt-2" : "text-slate-200 text-sm leading-relaxed mt-2"}>
                    {props.canReplay ? (
                        <>Vous pouvez revoir l’aperçu ici. Débloquez l’accès pour télécharger l’original et garder le
                            lien.</>
                    ) : (
                        <>La vidéo se prépare… Elle apparaîtra ici automatiquement dès qu’elle est prête.</>
                    )}
                </p>

                <div
                    className={isLight ? "mt-3 flex items-center gap-2 text-[11px] text-stone-500" : "mt-3 flex items-center gap-2 text-[11px] text-slate-400"}>
                    <Heart size={14} className={isLight ? "text-rose-400" : "text-cyan-300"}/>
                    <span className="font-mono">{props.statusLine}</span>
                    <span
                        className={isLight ? "ml-auto font-mono text-stone-500 tabular-nums" : "ml-auto font-mono text-slate-500 tabular-nums"}>
            {pct}%
          </span>
                </div>

                {props.shareUrl ? (
                    <div className="mt-4 flex items-center justify-between gap-3">
                        <div
                            className={
                                isLight
                                    ? "flex-1 text-[11px] font-mono bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-700 truncate"
                                    : "flex-1 text-[11px] font-mono bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-200 truncate"
                            }
                        >
                            {props.shareUrl}
                        </div>
                        <CopyButton value={props.shareUrl}/>
                    </div>
                ) : null}
            </div>

            {/* Title */}
            <div className="space-y-3">
                <h1 className={isLight ? "text-3xl font-serif text-stone-900 leading-tight" : "text-4xl font-bold leading-tight tracking-tight"}>
                    Récupérez ce{" "}
                    <span
                        className={isLight ? "italic text-stone-800" : "text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400"}>
            moment unique
          </span>
                    .
                </h1>

                {/* Timer */}
                {expiresAtMs != null ? (
                    <div
                        className={
                            isLight
                                ? "lifee-sweep rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-4 relative overflow-hidden"
                                : "bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-4 animate-pulse-slow relative overflow-hidden group"
                        }
                    >
                        <div
                            className={isLight ? "p-2.5 bg-white rounded-full border border-rose-200" : "p-2.5 bg-red-500/20 rounded-full z-10"}>
                            <Clock size={22} className={isLight ? "text-rose-500" : "text-red-400 animate-spin-slow"}/>
                        </div>

                        <div>
                            <div
                                className={
                                    isLight
                                        ? "text-xs text-rose-700 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"
                                        : "text-xs text-red-300 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"
                                }
                            >
                                <AlertTriangle size={10} fill="currentColor"/> Suppression automatique
                            </div>

                            <div
                                className={isLight ? "text-3xl font-mono font-bold text-stone-900 tabular-nums" : "text-3xl font-mono font-bold text-white tabular-nums leading-none tracking-tight"}>
                                {formatTime(timeLeftSec)}
                            </div>

                            <div
                                className={isLight ? "text-[11px] text-stone-500 font-mono mt-1" : "text-[11px] text-slate-400 font-mono mt-1"}>
                                Enregistré {TTL_HOURS}h
                            </div>
                        </div>
                    </div>
                ) : null}

                <p className={isLight ? "text-stone-600 text-sm leading-relaxed" : "text-slate-400 text-sm leading-relaxed border-l-2 border-indigo-500/30 pl-4"}>
                    Débloquez l’accès pour télécharger la version originale et conserver le lien dans votre espace
                    Lifee.
                </p>
            </div>

            {/* CTA */}
            <div className="space-y-3 pt-1">
                <button
                    onClick={props.onUnlock}
                    className={
                        isLight
                            ? "w-full py-4 bg-stone-900 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all flex items-center justify-center gap-3"
                            : "w-full py-4 bg-white text-slate-950 font-bold rounded-xl shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_-5px_rgba(255,255,255,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                    }
                >
                    <Download size={18}
                              className={isLight ? "text-white" : "group-hover:animate-bounce text-indigo-600"}/>
                    {props.ctaLabel ?? (props.canReplay ? "Télécharger la vidéo" : "Débloquer pour télécharger")}
                </button>

                <button
                    onClick={props.onUnlock}
                    className={
                        isLight
                            ? "w-full py-3 bg-white border border-stone-200 text-stone-800 font-medium rounded-xl hover:bg-stone-50 transition-colors text-sm"
                            : "w-full py-3 bg-transparent border border-white/10 text-white font-medium rounded-xl hover:bg-white/5 transition-colors text-sm"
                    }
                >
                    Je veux créer mon propre album
                </button>

                <p className={isLight ? "text-center text-[10px] text-stone-500 flex items-center justify-center gap-1.5 uppercase tracking-wider pt-2" : "text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 uppercase tracking-wider pt-2"}>
                    <Lock size={10}/> Stockage sécurisé & privé
                </p>
            </div>
        </div>
    );
}
