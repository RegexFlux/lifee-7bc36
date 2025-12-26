// File: src/components/EmailSharePopover.tsx
"use client";

import React, {useEffect, useId, useMemo, useRef, useState} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {Mail, Send, Loader2, CheckCircle2, X, ExternalLink, Copy} from "lucide-react";

import {fetchJson, HttpError, isValidEmail} from "@/components/landing/interactiveDemo/utils";
import {useAuthGate} from "@/hooks/useAuthGate";

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
                                      label = "Email",
                                  }: {
    generationId: string | null;
    disabled?: boolean;
    size?: "sm" | "md";
    label?: string;
}) {
    const reduced = useReducedMotion();
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

    const title = useMemo(() => {
        if (!generationId) return "Générez une vidéo pour partager";
        return "Envoyer le lien";
    }, [generationId]);

    // click-outside + esc
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
        const t = window.setTimeout(() => inputRef.current?.focus(), 40);
        return () => window.clearTimeout(t);
    }, [open]);

    // ✅ crée/active le share link quand on ouvre
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
                    {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: "{}",
                    }
                );

                if (!alive) return;

                const publicPath = extractPublicPath(payload) ?? `/slug/${generationId}`;
                setShareUrl(absoluteUrlFromPath(publicPath));
            } catch (e: any) {
                if (!alive) return;

                // fallback stable
                setShareUrl(absoluteUrlFromPath(`/slug/${generationId}`));

                if (e instanceof HttpError) setErr(e.message || "Impossible de créer le lien.");
                else setErr("Impossible de créer le lien.");
            } finally {
                if (alive) setShareLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, generationId]);

    const onToggle = async () => {
        if (!canUse) return;

        // ✅ AuthGate si guest
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
        if (!ok) setErr("Impossible de copier.");
        else window.setTimeout(() => setCopied(false), 1200);
    };

    // anti-spam infra: mailto pour l’instant
    const sendViaMailto = async () => {
        if (!shareUrl) {
            setErr("Lien indisponible.");
            return;
        }
        const to = email.trim();
        if (!isValidEmail(to)) {
            setErr("Email invalide.");
            return;
        }

        setSending(true);
        try {
            const subject = "Votre souvenir Lifee";
            const body = `Voici le lien de partage : ${shareUrl}`;
            window.location.href =
                `mailto:${encodeURIComponent(to)}` +
                `?subject=${encodeURIComponent(subject)}` +
                `&body=${encodeURIComponent(body)}`;

            setSent(true);
            window.setTimeout(() => setSent(false), 1200);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="relative" ref={rootRef}>
            <button
                onClick={onToggle}
                className={cx(btnClass, (!canUse || disabled) && "opacity-50 pointer-events-none")}
                aria-label="Envoyer le lien par email"
                title={title}
                aria-controls={open ? popId : undefined}
                aria-expanded={open}
                type="button"
            >
                <Mail className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"}/>
                {label}
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
                                <div className="text-xs font-semibold text-stone-800">Envoyer le lien</div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="rounded-xl border border-stone-200 bg-white/70 hover:bg-white p-1.5 transition"
                                    aria-label="Fermer"
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
                        Création du lien…
                      </span>
                                        ) : shareUrl ? (
                                            <span className="truncate block">{shareUrl}</span>
                                        ) : (
                                            "Lien indisponible."
                                        )}
                                    </div>

                                    <div className="shrink-0 flex items-center gap-1">
                                        {shareUrl ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={copyLink}
                                                    className="h-8 px-2 rounded-xl border border-stone-200 bg-white/70 hover:bg-white text-[11px] font-bold text-stone-800 inline-flex items-center gap-1"
                                                    title="Copier"
                                                >
                                                    <Copy className="h-3.5 w-3.5"/>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => window.open(shareUrl, "_blank", "noreferrer")}
                                                    className="h-8 px-2 rounded-xl border border-stone-200 bg-white/70 hover:bg-white text-[11px] font-bold text-stone-800 inline-flex items-center gap-1"
                                                    title="Ouvrir"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5"/>
                                                </button>
                                            </>
                                        ) : null}
                                    </div>
                                </div>

                                {copied && (
                                    <div
                                        className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                                        <CheckCircle2 className="h-4 w-4"/>
                                        Lien copié.
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
                                    placeholder="nom@domaine.com"
                                    className="h-10 w-full rounded-xl border border-stone-200 bg-white/85 px-3 text-[12px] font-semibold text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-300/60"
                                    inputMode="email"
                                    autoComplete="email"
                                    aria-label="Adresse email"
                                />

                                <button
                                    onClick={sendViaMailto}
                                    type="button"
                                    disabled={sending || shareLoading || !shareUrl || !isValidEmail(email)}
                                    className={cx(
                                        "h-10 shrink-0 inline-flex items-center gap-1 rounded-xl px-3 text-[12px] font-black transition active:scale-[0.98]",
                                        "border border-stone-200 bg-white/85 hover:bg-white text-stone-900",
                                        "disabled:opacity-50 disabled:pointer-events-none"
                                    )}
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                        <Send className="h-4 w-4"/>}
                                    Envoyer
                                </button>
                            </div>

                            <div className="mt-2 text-[11px] text-stone-500">
                                On ouvre votre client mail avec le lien de partage.
                            </div>

                            {sent && (
                                <div
                                    className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4"/>
                                    Ouverture du mail ✓
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
