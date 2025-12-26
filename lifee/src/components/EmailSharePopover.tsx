// File: src/components/EmailSharePopover.tsx
"use client";

import React, {useEffect, useId, useMemo, useRef, useState} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {Mail, Send, Loader2, CheckCircle2, X} from "lucide-react";

import {useT} from "@/lib/i18n/useT";
import {fetchJson, HttpError, isValidEmail} from "@/components/landing/interactiveDemo/utils";

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function glassPillBase() {
    return "rounded-2xl border border-stone-200 bg-white/80 backdrop-blur px-3 py-2 shadow-sm";
}

function mailtoUrl(to: string, subject: string, body: string) {
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(body);
    return `mailto:${encodeURIComponent(to)}?subject=${s}&body=${b}`;
}

export function EmailSharePopover(props: {
    jobId: string | null;
    disabled?: boolean;
    size?: "sm" | "md";
    label?: string; // label du bouton
    mode?: "api" | "mailto";
    /** Optionnel : si tu veux passer un shareUrl directement (sinon le back le déduit via jobId) */
    shareUrl?: string | null;
}) {
    const {
        jobId,
        disabled,
        size = "sm",
        label,
        mode = "api",
        shareUrl,
    } = props;

    const reduced = useReducedMotion();
    const {t} = useT();

    const popId = useId();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const canSend = !!jobId && !disabled;

    const btnClass =
        size === "md"
            ? "inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 hover:bg-white px-4 py-2 text-[12px] font-black text-stone-900 transition active:scale-[0.99]"
            : "inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white/80 hover:bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-800 transition active:scale-[0.98]";

    const btnLabel = label ?? t("emailPopover.button");

    const hintTitle = useMemo(() => {
        if (!jobId) return t("emailPopover.noJobTitle");
        return t("emailPopover.title");
    }, [jobId, t]);

    // click outside + esc
    useEffect(() => {
        if (!open) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        const onDown = (e: MouseEvent) => {
            const el = rootRef.current;
            if (!el) return;
            if (e.target instanceof Node && !el.contains(e.target)) {
                setOpen(false);
            }
        };

        window.addEventListener("keydown", onKey);
        window.addEventListener("mousedown", onDown);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("mousedown", onDown);
        };
    }, [open]);

    // autofocus input on open
    useEffect(() => {
        if (!open) return;
        const tmr = window.setTimeout(() => inputRef.current?.focus(), 40);
        return () => window.clearTimeout(tmr);
    }, [open]);

    const close = () => setOpen(false);

    const send = async () => {
        if (!jobId) return;

        const to = email.trim();
        setErr(null);
        setSent(false);

        if (!isValidEmail(to)) {
            setErr(t("emailPopover.invalid"));
            return;
        }

        setSending(true);

        try {
            if (mode === "mailto") {
                // best-effort mailto (pas de back requis)
                const url =
                    shareUrl ||
                    `${window.location.origin}/slug/${encodeURIComponent(jobId)}`; // fallback “cohérent”
                const subject = t("emailPopover.mailtoSubject");
                const body = t("emailPopover.mailtoBody", {url});
                window.location.href = mailtoUrl(to, subject, body);

                setSent(true);
                window.setTimeout(() => setOpen(false), 900);
                return;
            }

            // mode api: /api/lifee/demo/email
            await fetchJson<{ ok: true }>("/api/lifee/demo/email", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({to, jobId}),
            });

            setSent(true);
            window.setTimeout(() => setOpen(false), 900);
        } catch (e: any) {
            if (e instanceof HttpError) {
                // message déjà normalisé via fetchJson
                setErr(e.message || t("emailPopover.sendFailed"));
            } else {
                setErr(e?.message || t("emailPopover.sendFailed"));
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="relative" ref={rootRef}>
            <button
                type="button"
                onClick={() => {
                    if (!canSend) return;
                    setErr(null);
                    setSent(false);
                    setOpen((v) => !v);
                }}
                className={cx(btnClass, (!canSend || disabled) && "opacity-50 pointer-events-none")}
                aria-label={t("emailPopover.ariaButton")}
                aria-controls={open ? popId : undefined}
                aria-expanded={open}
                title={!jobId ? t("emailPopover.noJobTitle") : t("emailPopover.title")}
            >
                <Mail className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"}/>
                {btnLabel}
            </button>

            <AnimatePresence>
                {open && canSend && (
                    <motion.div
                        id={popId}
                        initial={{opacity: 0, y: -6, scale: 0.98, filter: "blur(8px)"}}
                        animate={{opacity: 1, y: 0, scale: 1, filter: "blur(0px)"}}
                        exit={{opacity: 0, y: -6, scale: 0.98, filter: "blur(8px)"}}
                        transition={{duration: reduced ? 0 : 0.18, ease: [0.16, 1, 0.3, 1]}}
                        className="absolute right-0 mt-2 w-[340px] z-[200]"
                    >
                        <div className={cx(glassPillBase(), "p-3")}>
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-stone-800">
                                    {t("emailPopover.title")}
                                </div>
                                <button
                                    type="button"
                                    onClick={close}
                                    className="rounded-xl border border-stone-200 bg-white/70 hover:bg-white p-1.5 transition"
                                    aria-label={t("emailPopover.close")}
                                >
                                    <X className="h-4 w-4 text-stone-700"/>
                                </button>
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
                                    aria-label={t("emailPopover.ariaInput")}
                                />

                                <button
                                    type="button"
                                    onClick={send}
                                    disabled={sending || !isValidEmail(email)}
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

                            <div className="mt-2 text-[11px] text-stone-500">
                                {t("emailPopover.hint")}
                            </div>

                            {err && <div className="mt-2 text-[11px] font-semibold text-rose-600">{err}</div>}

                            {sent && (
                                <div
                                    className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4"/>
                                    {t("emailPopover.sent")}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
