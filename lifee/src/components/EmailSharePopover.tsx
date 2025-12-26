// File: src/components/EmailSharePopover.tsx
"use client";

import React, {useEffect, useId, useMemo, useRef, useState} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {Mail, Send, Loader2, CheckCircle2, X, ExternalLink, Copy} from "lucide-react";

import {fetchJson, HttpError, isValidEmail} from "@/components/landing/interactiveDemo/utils";
import {useAuthGate} from "@/hooks/useAuthGate";
import {useT} from "@/lib/i18n/useT";

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function glassPillBase() {
    return "rounded-2xl border border-stone-200 bg-white/80 backdrop-blur px-3 py-2 shadow-sm";
}

type ShareApiResp = any;

function extractPublicPath(payload: ShareApiResp): string | null {
    if (!payload) return null;
    if (typeof payload.publicPath === "string") return payload.publicPath;
    if (typeof payload?.data?.publicPath === "string") return payload.data.publicPath;
    if (typeof payload?.result?.publicPath === "string") return payload.result.publicPath;
    return null;
}

function absoluteUrlFromPath(path: string) {
    return new URL(path, window.location.origin).toString();
}

async function safeCopy(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

export function EmailSharePopover({
                                      generationId,
                                      disabled,
                                      size = "sm",
                                      label,
                                  }: {
    generationId: string | null;
    disabled?: boolean;
    size?: "sm" | "md";
    label?: string;
}) {
    const reduced = useReducedMotion();
    const {t} = useT();
    const {requireLinked} = useAuthGate();

    const popId = useId();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [open, setOpen] = useState(false);

    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false); // mailto
    const [sent, setSent] = useState(false);
    const [copied, setCopied] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [shareLoading, setShareLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    const canUse = !!generationId && !disabled;

    const btnClass =
        size === "md"
            ? "inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 hover:bg-white px-4 py-2 text-[12px] font-black text-stone-900 transition active:scale-[0.99]"
            : "inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white/80 hover:bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-800 transition active:scale-[0.98]";

    const btnLabel = label ?? t("emailPopover.button");

    const title = useMemo(() => {
        if (!generationId) return t("emailPopover.linkUnavailable");
        return t("emailPopover.title");
    }, [generationId, t]);

    // outside + esc
    useEffect(() => {
        if (!open) return;

        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        const onDown = (e: MouseEvent) => {
            const el = rootRef.current;
            if (!el) return;
            if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
        };

        window.addEventListener("keydown", onKey);
        window.addEventListener("mousedown", onDown);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("mousedown", onDown);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const tmr = window.setTimeout(() => inputRef.current?.focus(), 40);
        return () => window.clearTimeout(tmr);
    }, [open]);

    // fetch shareUrl on open
    useEffect(() => {
        if (!open) return;
        if (!generationId) return;

        let alive = true;

        (async () => {
            setErr(null);
            setCopied(false);
            setSent(false);
            setShareUrl(null);

            setShareLoading(true);
            try {
                const payload = await fetchJson<ShareApiResp>(
                    `/api/generations/${encodeURIComponent(generationId)}/share`,
                    {method: "POST", headers: {"Content-Type": "application/json"}, body: "{}"}
                );

                if (!alive) return;

                const publicPath = extractPublicPath(payload) ?? `/slug/${generationId}`;
                setShareUrl(absoluteUrlFromPath(publicPath));
            } catch (e: any) {
                if (!alive) return;
                setShareUrl(absoluteUrlFromPath(`/slug/${generationId}`));
                setErr(e instanceof HttpError ? (e.message || t("emailPopover.err.shareFailed")) : t("emailPopover.err.shareFailed"));
            } finally {
                if (alive) setShareLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, generationId, t]);

    const toggle = async () => {
        if (!canUse) return;
        const ok = await requireLinked("share");
        if (!ok) return;
        setErr(null);
        setOpen((v) => !v);
    };

    const copyLink = async () => {
        if (!shareUrl) return;
        setErr(null);
        const ok = await safeCopy(shareUrl);
        setCopied(ok);
        if (!ok) setErr(t("emailPopover.err.copyFailed"));
        else window.setTimeout(() => setCopied(false), 1200);
    };

    const sendViaMailto = async () => {
        if (!shareUrl) {
            setErr(t("emailPopover.linkUnavailable"));
            return;
        }
        const to = email.trim();
        if (!isValidEmail(to)) {
            setErr(t("emailPopover.err.invalidEmail"));
            return;
        }

        setSending(true);
        try {
            const subject = t("emailPopover.mail.subject");
            const body = t("emailPopover.mail.body", {url: shareUrl});
            window.location.href =
                `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            setSent(true);
            window.setTimeout(() => setSent(false), 1200);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="relative" ref={rootRef}>
            <button
                onClick={toggle}
                className={cx(btnClass, (!canUse || disabled) && "opacity-50 pointer-events-none")}
                aria-label={t("emailPopover.title")}
                title={title}
                aria-controls={open ? popId : undefined}
                aria-expanded={open}
                type="button"
            >
                <Mail className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"}/>
                {btnLabel}
            </button>

            <AnimatePresence>
                {open && canUse && (
                    <motion.div
                        id={popId}
                        initial={{opacity: 0, y: -6, scale: 0.98, filter: "blur(8px)"}}
                        animate={{opacity: 1, y: 0, scale: 1, filter: "blur(0px)"}}
                        exit={{opacity: 0, y: -6, scale: 0.98, filter: "blur(8px)"}}
                        transition={{duration: reduced ? 0 : 0.18, ease: [0.16, 1, 0.3, 1]}}
                        className="absolute right-0 mt-2 w-[360px] z-[200]"
                    >
                        <div className={cx(glassPillBase(), "p-3")}>
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-stone-800">{t("emailPopover.title")}</div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="rounded-xl border border-stone-200 bg-white/70 hover:bg-white p-1.5 transition"
                                    aria-label={t("emailPopover.title")}
                                    type="button"
                                >
                                    <X className="h-4 w-4 text-stone-700"/>
                                </button>
                            </div>

                            <div className="mt-2 rounded-2xl border border-stone-200 bg-white/70 p-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 text-[11px] text-stone-600">
                                        {shareLoading ? (
                                            <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                                {t("emailPopover.fetching")}
                      </span>
                                        ) : shareUrl ? (
                                            <span className="truncate block">{shareUrl}</span>
                                        ) : (
                                            t("emailPopover.linkUnavailable")
                                        )}
                                    </div>

                                    {shareUrl ? (
                                        <div className="shrink-0 flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={copyLink}
                                                className="h-8 px-2 rounded-xl border border-stone-200 bg-white/70 hover:bg-white text-[11px] font-bold text-stone-800 inline-flex items-center gap-1"
                                                title={t("emailPopover.copy")}
                                            >
                                                <Copy className="h-3.5 w-3.5"/>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => window.open(shareUrl, "_blank", "noreferrer")}
                                                className="h-8 px-2 rounded-xl border border-stone-200 bg-white/70 hover:bg-white text-[11px] font-bold text-stone-800 inline-flex items-center gap-1"
                                                title={t("emailPopover.open")}
                                            >
                                                <ExternalLink className="h-3.5 w-3.5"/>
                                            </button>
                                        </div>
                                    ) : null}
                                </div>

                                {copied && (
                                    <div
                                        className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                                        <CheckCircle2 className="h-4 w-4"/>
                                        OK
                                    </div>
                                )}
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setErr(null);
                                        setSent(false);
                                    }}
                                    placeholder={t("emailPopover.placeholder")}
                                    className="h-10 w-full rounded-xl border border-stone-200 bg-white/85 px-3 text-[12px] font-semibold text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-300/60"
                                    inputMode="email"
                                    autoComplete="email"
                                />

                                <button
                                    type="button"
                                    onClick={sendViaMailto}
                                    disabled={sending || shareLoading || !shareUrl || !isValidEmail(email)}
                                    className={cx(
                                        "h-10 shrink-0 inline-flex items-center gap-1 rounded-xl px-3 text-[12px] font-black transition active:scale-[0.98]",
                                        "border border-stone-200 bg-white/85 hover:bg-white text-stone-900",
                                        "disabled:opacity-50 disabled:pointer-events-none"
                                    )}
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                        <Send className="h-4 w-4"/>}
                                    {t("emailPopover.send")}
                                </button>
                            </div>

                            <div className="mt-2 text-[11px] text-stone-500">{t("emailPopover.hint")}</div>

                            {sent && (
                                <div
                                    className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4"/>
                                    {t("emailPopover.sent")}
                                </div>
                            )}

                            {err && <div className="mt-2 text-[11px] font-semibold text-rose-600">{err}</div>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
