// File: src/components/landing/interactiveDemo/Dock.tsx
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
import {isValidEmail} from "./utils";
import {useT} from "@/lib/i18n/useT";

type Props = {
    open: boolean;
    onOpen: () => void;
    onMinimize: () => void;

    state: DemoState;
    generationId: string | null;
    shareUrl: string | null;
    videoUrl: string | null;
    error: string | null;

    onOpenResult: () => void;
    onOpenShare: () => void;
};

function mailtoShare(to: string, shareUrl: string, subject: string, body: string) {
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(`${body}\n\n${shareUrl}`);
    return `mailto:${encodeURIComponent(to)}?subject=${s}&body=${b}`;
}

export default function Dock(props: Props) {
    const reduce = useReducedMotion();
    const {t} = useT();

    const [emailOpen, setEmailOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);

    const canShare = !!props.shareUrl;
    const canOpenResult = props.state === "success" && !!props.videoUrl;

    const title = useMemo(() => {
        if (props.state === "idle") return t("dock.status.idle");
        if (props.state === "analyzing") return t("dock.status.analyzing");
        if (props.state === "generating") return t("dock.status.generating");
        if (props.state === "success") return t("dock.status.success");
        return t("dock.status.failed");
    }, [props.state, t]);

    const subtitle = useMemo(() => {
        if (props.state === "idle") return t("dock.subtitle.idle");
        if (props.state === "generating" || props.state === "analyzing") return t("dock.subtitle.generating");
        if (props.state === "success") return t("dock.subtitle.success");
        return t("dock.subtitle.failed");
    }, [props.state, t]);

    const statusPill = useMemo(() => {
        if (props.state === "success") return "bg-emerald-100 text-emerald-800 border-emerald-200";
        if (props.state === "failed") return "bg-rose-100 text-rose-800 border-rose-200";
        if (props.state === "generating") return "bg-cyan-100 text-cyan-800 border-cyan-200";
        if (props.state === "analyzing") return "bg-indigo-100 text-indigo-800 border-indigo-200";
        return "bg-stone-100 text-stone-700 border-stone-200";
    }, [props.state]);

    const send = async () => {
        setSendError(null);
        setSent(null);

        const trimmed = email.trim();
        if (!isValidEmail(trimmed)) {
            setSendError(t("dock.email.invalid"));
            return;
        }
        if (!props.shareUrl || !props.generationId) {
            setSendError(t("dock.email.unavailable"));
            return;
        }

        setSending(true);
        try {
            const subject = "Lifee — votre vidéo";
            const body = "Voici le lien pour voir la vidéo :";
            const href = mailtoShare(trimmed, props.shareUrl, subject, body);
            window.location.href = href;

            setSent(t("dock.email.sent"));
            setEmailOpen(false);
            setEmail("");
        } catch (e: any) {
            setSendError(e?.message || "Error");
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
                    aria-label="Open generation dock"
                    title="Open"
                >
                    <Film size={16} className="text-stone-800"/>
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
            {props.state === "success" ? (
                <CheckCircle2 size={12}/>
            ) : props.state === "failed" ? (
                <AlertTriangle size={12}/>
            ) : (
                <span className="text-[10px]">•</span>
            )}
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
                                <div className="text-xs font-black text-stone-900 leading-tight">{t("dock.demo")}</div>
                                <div className="mt-0.5 flex flex-col justify-start items-center gap-2">
                  <span
                      className={`inline-flex items-center mr-auto gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusPill}`}
                  >
                    {props.state === "generating" || props.state === "analyzing" ? (
                        <Loader2 size={12} className="animate-spin"/>
                    ) : props.state === "success" ? (
                        <CheckCircle2 size={12}/>
                    ) : props.state === "failed" ? (
                        <AlertTriangle size={12}/>
                    ) : null}
                      {title}
                  </span>

                                    <span className="text-[11px] text-stone-500 truncate">{subtitle}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={props.onMinimize}
                            className="h-9 w-9 rounded-2xl border border-stone-200 bg-white/70 hover:bg-white transition grid place-items-center"
                            aria-label="Minimize"
                            title="Minimize"
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
                                        <div
                                            className="text-xs font-black text-rose-900">{t("dock.card.failed.title")}</div>
                                        <div className="text-xs text-rose-900/80 mt-0.5">
                                            {props.error || t("dock.card.failed.body")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {props.state === "success" && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-700 mt-0.5"/>
                                    <div className="min-w-0">
                                        <div
                                            className="text-xs font-black text-emerald-900">{t("dock.card.success.title")}</div>
                                        <div
                                            className="text-xs text-emerald-900/80 mt-0.5">{t("dock.card.success.body")}</div>
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
                                            {props.state === "analyzing" ? t("dock.card.analyzing.title") : t("dock.card.generating.title")}
                                        </div>
                                        <div
                                            className="text-xs text-cyan-900/80 mt-0.5">{t("dock.card.progress.body")}</div>
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
                                {t("dock.actions.open")}
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
                                {t("dock.actions.share")} <ExternalLink size={14}/>
                            </button>
                        </div>

                        {/* Email */}
                        <div className="pt-1">
                            <button
                                onClick={() => setEmailOpen((v) => !v)}
                                disabled={!canShare || !props.generationId}
                                className={[
                                    "w-full rounded-2xl border px-3 py-2 text-xs font-black transition flex items-center justify-center gap-2",
                                    canShare && props.generationId
                                        ? "border-stone-200 bg-white/70 hover:bg-white text-stone-900"
                                        : "border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed",
                                ].join(" ")}
                            >
                                <Mail size={14}/>
                                {t("dock.email.cta")}
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
                                                    placeholder={t("dock.email.placeholder")}
                                                    className="flex-1 h-9 rounded-xl border border-stone-200 bg-white/80 px-3 text-xs font-semibold text-stone-900 placeholder:text-stone-400 outline-none"
                                                />
                                                <button
                                                    onClick={send}
                                                    disabled={sending}
                                                    className="h-9 px-3 rounded-xl border border-stone-200 bg-stone-900 text-white text-xs font-black hover:bg-stone-800 transition disabled:opacity-60"
                                                >
                                                    {sending ? <Loader2 size={14}
                                                                        className="animate-spin"/> : t("dock.email.send")}
                                                </button>
                                            </div>

                                            {sendError && <div
                                                className="mt-2 text-[11px] font-semibold text-rose-700">{sendError}</div>}
                                            {sent && <div
                                                className="mt-2 text-[11px] font-semibold text-emerald-700">{sent}</div>}

                                            <div className="mt-2 text-[11px] text-stone-500">{t("dock.email.tip")}</div>
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
