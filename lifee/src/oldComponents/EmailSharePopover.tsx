"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mail, Send, Loader2, CheckCircle2, X } from "lucide-react";

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function glassPillBase() {
    // même langage que MiniAudioWidget
    return "rounded-2xl border border-stone-200 bg-white/80 backdrop-blur px-3 py-2 shadow-sm";
}

function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function EmailSharePopover({
                                      jobId,
                                      disabled,
                                      size = "sm",
                                      label = "Email",
                                  }: {
    jobId: string | null;
    disabled?: boolean;
    size?: "sm" | "md";
    label?: string;
}) {
    const reduced = useReducedMotion();

    const [open, setOpen] = React.useState(false);
    const [email, setEmail] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const [sent, setSent] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);

    const canSend = !!jobId && !disabled;

    const btnClass =
        size === "md"
            ? "inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 hover:bg-white px-4 py-2 text-[12px] font-black text-stone-900 transition active:scale-[0.99]"
            : "inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white/80 hover:bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-800 transition active:scale-[0.98]";

    const send = async () => {
        if (!jobId) return;
        const to = email.trim();

        setErr(null);
        setSent(false);

        if (!isEmail(to)) {
            setErr("Email invalide.");
            return;
        }

        setSending(true);
        try {
            const r = await fetch("/api/lifee/demo/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to, jobId }),
            });

            const data = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(data?.error || "Envoi impossible");

            setSent(true);
            setErr(null);
            window.setTimeout(() => setOpen(false), 1200);
        } catch (e: any) {
            setErr(e?.message || "Erreur lors de l’envoi.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => {
                    if (!canSend) return;
                    setErr(null);
                    setSent(false);
                    setOpen((v) => !v);
                }}
                className={cx(btnClass, (!canSend || disabled) && "opacity-50 pointer-events-none")}
                aria-label="Envoyer le lien par email"
                title={!jobId ? "Générez une vidéo pour envoyer le lien" : "Envoyer par email"}
            >
                <Mail className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
                {label}
            </button>

            <AnimatePresence>
                {open && canSend && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -6, scale: 0.98, filter: "blur(8px)" }}
                        transition={{ duration: reduced ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 mt-2 w-[340px] z-[200]"
                    >
                        <div className={cx(glassPillBase(), "p-3")}>
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-stone-800">Envoyer le lien par email</div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="rounded-xl border border-stone-200 bg-white/70 hover:bg-white p-1.5 transition"
                                    aria-label="Fermer"
                                >
                                    <X className="h-4 w-4 text-stone-700" />
                                </button>
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                                <input
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
                                    onClick={send}
                                    disabled={sending || !isEmail(email)}
                                    className={cx(
                                        "h-10 shrink-0 inline-flex items-center gap-1 rounded-xl px-3 text-[12px] font-black transition active:scale-[0.98]",
                                        "border border-stone-200 bg-white/85 hover:bg-white text-stone-900",
                                        "disabled:opacity-50 disabled:pointer-events-none"
                                    )}
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    Envoyer
                                </button>
                            </div>

                            <div className="mt-2 text-[11px] text-stone-500">
                                On envoie le <span className="font-semibold text-stone-700">lien de partage</span> (stable).
                            </div>

                            {err && <div className="mt-2 text-[11px] font-semibold text-rose-600">{err}</div>}

                            {sent && (
                                <div className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Email envoyé.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
