// /components/landing/interactiveDemo/Dock.tsx
"use client";

import React, {useMemo, useState} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Film,
    Loader2,
    Mail,
    X,
} from "lucide-react";

import type {DemoState} from "@/types/interactiveDemo";
import {fetchJson, isValidEmail} from "./utils";
import type {SendEmailResponse} from "@/types/interactiveDemo";

type Props = {
    open: boolean;
    onOpen: () => void;
    onMinimize: () => void;

    state: DemoState;
    jobId: string | null;
    shareUrl: string | null;
    videoUrl: string | null;
    error: string | null;

    onOpenResult: () => void;
    onOpenShare: () => void;
};

function statusLabel(state: DemoState) {
    if (state === "idle") return "Démo";
    if (state === "analyzing") return "Préparation";
    if (state === "generating") return "Génération";
    if (state === "success") return "Prêt";
    return "Erreur";
}

function statusPill(state: DemoState) {
    if (state === "success") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (state === "failed") return "bg-rose-100 text-rose-800 border-rose-200";
    if (state === "generating") return "bg-cyan-100 text-cyan-800 border-cyan-200";
    if (state === "analyzing") return "bg-indigo-100 text-indigo-800 border-indigo-200";
    return "bg-stone-100 text-stone-700 border-stone-200";
}

export default function Dock(props: Props) {
    const reduce = useReducedMotion();
    const [emailOpen, setEmailOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);

    const canShare = !!props.shareUrl;
    const canOpenResult = props.state === "success" && !!props.videoUrl;

    const title = useMemo(() => statusLabel(props.state), [props.state]);

    const send = async () => {
        setSendError(null);
        setSent(null);

        const trimmed = email.trim();
        if (!isValidEmail(trimmed)) {
            setSendError("Email invalide.");
            return;
        }
        if (!props.shareUrl || !props.jobId) {
            setSendError("Lien indisponible.");
            return;
        }

        setSending(true);
        try {
            await fetchJson<SendEmailResponse>("/api/lifee/demo/email", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email: trimmed, jobId: props.jobId, shareUrl: props.shareUrl}),
            });
            setSent("Envoyé ✓");
            setEmailOpen(false);
            setEmail("");
        } catch (e: any) {
            setSendError(e?.message || "Impossible d’envoyer.");
        } finally {
            setSending(false);
        }
    };

    // Minimized bubble (toujours visible)
    if (!props.open) {
        return (
            <div className="fixed top-4 right-4 z-[70]">
                <button
                    onClick={props.onOpen}
                    className={[
                        "relative h-11 w-11 rounded-2xl border",
                        "bg-white/85 backdrop-blur border-stone-200 shadow-sm",
                        "hover:bg-white active:scale-[0.98] transition",
                        "flex items-center justify-center",
                    ].join(" ")}
                    aria-label="Ouvrir le dock de génération"
                    title="Ouvrir"
                >
                    <Film size={16} className="text-stone-800"/>
                    {/* tiny indicator */}
                    <span
                        className={[
                            "absolute -top-1 -left-1 h-4 w-4 rounded-full grid place-items-center shadow",
                            props.state === "success"
                                ? "bg-emerald-500 text-white"
                                : props.state === "failed"
                                    ? "bg-rose-500 text-white"
                                    : props.state === "generating" || props.state === "analyzing"
                                        ? "bg-cyan-500 text-white"
                                        : "bg-stone-300 text-stone-700",
                        ].join(" ")}
                    >
            {props.state === "success" ? <CheckCircle2 size={12}/> : props.state === "failed" ?
                <AlertTriangle size={12}/> : <span className="text-[10px]">•</span>}
          </span>
                </button>
            </div>
        );
    }

    return (
        <div className="fixed top-4 right-4 z-[70] top-21">
            <AnimatePresence>
                <motion.div
                    initial={reduce ? false : {y: -10, opacity: 0, scale: 0.98}}
                    animate={reduce ? {} : {y: 0, opacity: 1, scale: 1}}
                    exit={reduce ? {} : {y: -10, opacity: 0, scale: 0.98}}
                    transition={{duration: 0.18}}
                    className={[
                        "w-[320px] max-w-[92vw]",
                        "rounded-2xl border border-stone-200 bg-white/85 backdrop-blur shadow-sm",
                        "overflow-hidden",
                    ].join(" ")}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200/70">
                        <div className="flex items-center gap-2">
                            <div
                                className="h-9 w-9 rounded-2xl border border-stone-200 bg-white/70 grid place-items-center">
                                <Film size={16} className="text-stone-800"/>
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-black text-stone-900 leading-tight">Votre démo</div>
                                <div className="mt-0.5 flex flex-col justify-start items-center gap-2">
                  <span
                      className={`inline-flex items-center mr-auto gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusPill(props.state)}`}>
                    {props.state === "generating" || props.state === "analyzing" ? (
                        <Loader2 size={12} className="animate-spin"/>
                    ) : props.state === "success" ? (
                        <CheckCircle2 size={12}/>
                    ) : props.state === "failed" ? (
                        <AlertTriangle size={12}/>
                    ) : null}
                      {title}
                  </span>

                                    <span className="text-[11px] text-stone-500 truncate">
                    {props.state === "idle"
                        ? "1 génération / IP"
                        : props.state === "generating"
                            ? "Vous pouvez continuer à naviguer"
                            : props.state === "success"
                                ? "Disponible"
                                : "À corriger"}
                  </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={props.onMinimize}
                            className="h-9 w-9 rounded-2xl border border-stone-200 bg-white/70 hover:bg-white transition grid place-items-center"
                            aria-label="Réduire"
                            title="Réduire"
                        >
                            <X size={16} className="text-stone-700"/>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-3 space-y-2">
                        {props.state === "failed" && (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle size={16} className="text-rose-700 mt-0.5"/>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-rose-900">Échec</div>
                                        <div
                                            className="text-xs text-rose-900/80 mt-0.5">{props.error || "Une erreur est survenue."}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {props.state === "success" && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-700 mt-0.5"/>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-emerald-900">Votre vidéo est prête</div>
                                        <div className="text-xs text-emerald-900/80 mt-0.5">Ouvrez-la ou partagez-la
                                            quand vous voulez.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(props.state === "generating" || props.state === "analyzing") && (
                            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2">
                                <div className="flex items-start gap-2">
                                    <Loader2 size={16} className="text-cyan-700 mt-0.5 animate-spin"/>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-cyan-900">
                                            {props.state === "analyzing" ? "Préparation…" : "Génération en cours…"}
                                        </div>
                                        <div className="text-xs text-cyan-900/80 mt-0.5">
                                            Le dock restera ici pendant que vous naviguez.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                                onClick={props.onOpenResult}
                                disabled={!canOpenResult}
                                className={[
                                    "rounded-2xl border px-3 py-2 text-xs font-black transition",
                                    canOpenResult
                                        ? "border-stone-200 bg-white/70 hover:bg-white text-stone-900"
                                        : "border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed",
                                ].join(" ")}
                            >
                                Ouvrir
                            </button>

                            <button
                                onClick={props.onOpenShare}
                                disabled={!canShare}
                                className={[
                                    "rounded-2xl border px-3 py-2 text-xs font-black transition flex items-center justify-center gap-2",
                                    canShare
                                        ? "border-stone-200 bg-white/70 hover:bg-white text-stone-900"
                                        : "border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed",
                                ].join(" ")}
                            >
                                Partager <ExternalLink size={14}/>
                            </button>
                        </div>

                        {/* Email */}
                        <div className="pt-1">
                            <button
                                onClick={() => setEmailOpen((v) => !v)}
                                disabled={!canShare || !props.jobId}
                                className={[
                                    "w-full rounded-2xl border px-3 py-2 text-xs font-black transition flex items-center justify-center gap-2",
                                    canShare && props.jobId
                                        ? "border-stone-200 bg-white/70 hover:bg-white text-stone-900"
                                        : "border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed",
                                ].join(" ")}
                            >
                                <Mail size={14}/>
                                Envoyer par email
                            </button>

                            <AnimatePresence>
                                {emailOpen && (
                                    <motion.div
                                        initial={reduce ? false : {height: 0, opacity: 0}}
                                        animate={reduce ? {} : {height: "auto", opacity: 1}}
                                        exit={reduce ? {} : {height: 0, opacity: 0}}
                                        transition={{duration: 0.18}}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-2 rounded-2xl border border-stone-200 bg-white/70 p-2">
                                            <div className="flex gap-2">
                                                <input
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="email@exemple.com"
                                                    className="flex-1 h-9 rounded-xl border border-stone-200 bg-white/80 px-3 text-xs font-semibold text-stone-900 placeholder:text-stone-400 outline-none"
                                                />
                                                <button
                                                    onClick={send}
                                                    disabled={sending}
                                                    className="h-9 px-3 rounded-xl border border-stone-200 bg-stone-900 text-white text-xs font-black hover:bg-stone-800 transition disabled:opacity-60"
                                                >
                                                    {sending ?
                                                        <Loader2 size={14} className="animate-spin"/> : "Envoyer"}
                                                </button>
                                            </div>

                                            {sendError && <div
                                                className="mt-2 text-[11px] font-semibold text-rose-700">{sendError}</div>}
                                            {sent && <div
                                                className="mt-2 text-[11px] font-semibold text-emerald-700">{sent}</div>}

                                            <div className="mt-2 text-[11px] text-stone-500">
                                                Astuce : envoyez le lien à un proche pour le regarder ensemble.
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
