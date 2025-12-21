// components/lifee/ConversionCard.tsx
import React, {useEffect, useMemo, useState} from "react";
import {Download, Lock, ShieldCheck, Heart} from "lucide-react";
import {CopyButton} from "./CopyButton";
import {Clock, AlertTriangle} from "lucide-react";

export function ConversionCard(
    props: Readonly<{
        canReplay: boolean;
        statusLine: string;
        progress: number;
        shareUrl: string;
        onUnlock: () => void;
        ctaLabel?: string;
        createdAt?: string | null; // ISO string (ex: "2025-12-21T19:42:00.000Z")
    }>
) {
    const pct = Math.round(props.progress * 100);

    // ✅ Durée avant suppression (24h)
    const TTL_MS = 2 * 60 * 60 * 1000;

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    // createdAt -> ms
    const createdAtMs = useMemo(() => {
        if (!props.createdAt) return null;
        const t = Date.parse(props.createdAt);
        return Number.isFinite(t) ? t : null;
    }, [props.createdAt]);

    // createdAt + ttl -> ms
    const expiresAtMs = useMemo(() => {
        if (createdAtMs == null) return null;
        return createdAtMs + TTL_MS;
    }, [createdAtMs]);

    // ✅ time left (seconds)
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

    return (
        <div className="space-y-8 animate-in slide-in-from-right-10 fade-in duration-700 delay-100 w-max max-w-full">
            {/* Hook (remplace message personnalisé) */}
            <div
                className="bg-slate-800/50 border border-white/10 p-5 rounded-2xl rounded-tl-sm relative shadow-xl backdrop-blur-sm w-full">
                <div
                    className="absolute -top-3 -left-1 bg-indigo-600 text-[10px] font-bold px-3 py-1 rounded-full text-white flex items-center gap-1 shadow-lg">
                    <ShieldCheck size={10} className="text-white"/>
                    Aperçu privé
                </div>

                <p className="text-slate-200 text-sm leading-relaxed mt-2">
                    {props.canReplay ? (
                        <>
                            Vous pouvez revoir l’aperçu ici. Débloquez l’accès pour télécharger l’original et garder le
                            lien de
                            revisionnage.
                        </>
                    ) : (
                        <>La vidéo se prépare… Elle apparaîtra ici automatiquement dès qu’elle est prête.</>
                    )}
                </p>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                    <Heart size={14} className="text-cyan-300"/>
                    <span className="font-mono">{props.statusLine}</span>
                    <span className="ml-auto font-mono text-slate-500">{pct}%</span>
                </div>

                {props.shareUrl ? (
                    <div className="mt-4 flex items-center justify-between gap-3">
                        <div
                            className="flex-1 text-[11px] font-mono bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-200 truncate">
                            {props.shareUrl}
                        </div>
                        <CopyButton value={props.shareUrl}/>
                    </div>
                ) : null}
            </div>

            <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight tracking-tight">
                    Récupérez ce <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            moment unique
          </span>
                    .
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-indigo-500/30 pl-4">
                    Débloquez l’accès pour télécharger la version originale, recevoir le lien de revisionnage, et le
                    garder dans
                    votre espace Lifee.
                </p>

                {/* TIMER D'URGENCE */}
                <div
                    className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-4 animate-pulse-slow relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                    <div className="p-2.5 bg-red-500/20 rounded-full z-10">
                        <Clock size={24} className="text-red-400 animate-spin-slow"/>
                    </div>
                    <div className="z-10">
                        <div
                            className="text-xs text-red-300 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                            <AlertTriangle size={10} fill="currentColor"/> Suppression imminente
                        </div>
                        <div
                            className="text-3xl font-mono font-bold text-white tabular-nums leading-none tracking-tight">
                            {formatTime(timeLeftSec)}
                        </div>
                    </div>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-indigo-500/30 pl-4">
                    Pour éviter la suppression automatique, créez un compte <strong className="text-white">gratuit et
                    sans engagement</strong> dès maintenant.
                </p>
            </div>


            {/* CTA */}
            <div className="space-y-4 pt-2">
                <button
                    onClick={props.onUnlock}
                    className="w-full py-4 bg-white text-slate-950 font-bold rounded-xl shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_-5px_rgba(255,255,255,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                    <span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"/>
                    <Download size={20} className="group-hover:animate-bounce text-indigo-600"/>
                    {props.ctaLabel ?? (props.canReplay ? "Télécharger la vidéo" : "Débloquer pour télécharger")}
                </button>

                <button
                    onClick={props.onUnlock}
                    className="w-full py-3 bg-transparent border border-white/10 text-white font-medium rounded-xl hover:bg-white/5 transition-colors text-sm"
                >
                    Je veux créer mon propre album
                </button>

                <p className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 uppercase tracking-wider pt-2">
                    <Lock size={10}/> Stockage sécurisé & privé
                </p>
            </div>

            {/* Social proof mini (tu peux garder ton bloc existant si tu veux) */}
        </div>
    );
}
