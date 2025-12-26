// File: src/components/auth/MiniAuthGate.tsx
"use client";

import React, {useEffect, useMemo, useState} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {ArrowRight, Mail, ShieldCheck, X, Loader2, AlertTriangle, Merge, Link2} from "lucide-react";

import {fetchJson, HttpError, isValidEmail} from "@/components/landing/interactiveDemo/utils";
import {useViewer} from "@/lib/auth/useViewer";
import {useT} from "@/lib/i18n/useT";

type Purpose = "link_guest" | "merge_into_existing";
type Reason = "save" | "export" | "share";

export function MiniAuthGate(props: {
    open: boolean;
    reason: Reason;
    onClose: () => void;
    onAuthed: () => Promise<void> | void;
}) {
    const reduced = useReducedMotion();
    const {t} = useT();
    const {viewer, isGuest, refresh} = useViewer();

    const [step, setStep] = useState<"email" | "code">("email");
    const [purpose, setPurpose] = useState<Purpose>("link_guest");

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [hint, setHint] = useState<string | null>(null);

    const title = useMemo(() => {
        if (props.reason === "export") return t("authGate.title.export");
        if (props.reason === "share") return t("authGate.title.share");
        return t("authGate.title.save");
    }, [props.reason, t]);

    useEffect(() => {
        if (!props.open) {
            setStep("email");
            setPurpose("link_guest");
            setEmail("");
            setCode("");
            setLoading(false);
            setErr(null);
            setHint(null);
        }
    }, [props.open]);

    useEffect(() => {
        if (!props.open) return;
        if (!viewer) return;
        if (!isGuest) props.onClose();
    }, [props.open, viewer, isGuest, props]);

    const sendCode = async (p: Purpose) => {
        const trimmed = email.trim().toLowerCase();
        if (!isValidEmail(trimmed)) {
            setErr(t("authGate.err.invalidEmail"));
            return;
        }

        setErr(null);
        setHint(null);
        setLoading(true);

        try {
            await fetchJson("/api/auth/email/send-code", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email: trimmed, purpose: p}),
            });
            setPurpose(p);
            setStep("code");
        } catch (e: any) {
            if (e instanceof HttpError && e.status === 429) {
                setErr(t("authGate.err.tooManyRequests"));
            } else {
                setErr(e?.message || t("authGate.err.sendFailed"));
            }
        } finally {
            setLoading(false);
        }
    };

    const verify = async () => {
        const trimmed = email.trim().toLowerCase();
        if (!isValidEmail(trimmed)) {
            setErr(t("authGate.err.invalidEmail"));
            return;
        }
        if (code.length !== 6) {
            setErr(t("authGate.err.invalidCode"));
            return;
        }

        setErr(null);
        setHint(null);
        setLoading(true);

        try {
            await fetchJson("/api/auth/email/verify-code", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email: trimmed, purpose, code}),
            });

            const v = await refresh();
            if (v?.user?.type === "guest") {
                setErr(t("authGate.err.invalidCode"));
                return;
            }

            await props.onAuthed();
            props.onClose();
        } catch (e: any) {
            if (e instanceof HttpError) {
                if (e.status === 409 && purpose === "link_guest") {
                    setErr(t("authGate.err.emailInUse"));
                    setHint(t("authGate.hint.merge"));
                    return;
                }
                if (e.status === 429) {
                    setErr(t("authGate.err.tooManyRequests"));
                    return;
                }
            }
            setErr(e?.message || t("authGate.err.invalidCode"));
        } finally {
            setLoading(false);
        }
    };

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={props.onClose}/>

            <motion.div
                initial={reduced ? false : {opacity: 0, y: 10, scale: 0.99}}
                animate={reduced ? {} : {opacity: 1, y: 0, scale: 1}}
                exit={reduced ? {} : {opacity: 0, y: 10, scale: 0.99}}
                transition={{duration: 0.18, ease: [0.16, 1, 0.3, 1]}}
                className="relative bg-white p-7 rounded-2xl w-full max-w-md shadow-2xl border border-stone-200"
                role="dialog"
                aria-modal="true"
            >
                <button onClick={props.onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
                    <X size={18}/>
                </button>

                <div className="text-center mb-5">
                    <div
                        className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-500">
                        <Link2 size={22}/>
                    </div>
                    <h3 className="text-xl font-serif text-stone-900">{title}</h3>
                    <p className="text-stone-500 text-sm mt-1">{t("authGate.desc")}</p>
                </div>

                {err && (
                    <div
                        className="mb-3 text-sm text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 flex gap-2">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0"/>
                        <div className="min-w-0">{err}</div>
                    </div>
                )}

                {hint && (
                    <div
                        className="mb-3 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                        {hint}
                    </div>
                )}

                {step === "email" ? (
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void sendCode("link_guest");
                        }}
                    >
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                                {t("authGate.label.email")}
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-stone-400" size={18}/>
                                <input
                                    type="email"
                                    required
                                    placeholder={t("authGate.placeholder.email")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg py-3 pl-10 pr-3 text-stone-800 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin"/> : null}
                            {t("authGate.cta.continue")} <ArrowRight size={18}/>
                        </button>

                        <p className="text-center text-xs text-stone-400 pt-1">{t("authGate.privacy")}</p>
                    </form>
                ) : (
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void verify();
                        }}
                    >
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                                {t("authGate.label.code")}
                            </label>
                            <input
                                inputMode="numeric"
                                pattern="[0-9]*"
                                required
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-3 px-3 text-stone-800 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all font-mono tracking-widest text-center"
                            />

                            <div className="mt-2 text-xs text-stone-500 flex items-center justify-between">
                <span>
                  {email.trim().toLowerCase()}
                </span>
                                <button
                                    type="button"
                                    onClick={() => void sendCode(purpose)}
                                    disabled={loading}
                                    className="text-stone-700 hover:text-stone-900 underline underline-offset-2 disabled:opacity-60"
                                >
                                    {t("authGate.cta.resend")}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || code.length !== 6}
                            className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin"/> : <ShieldCheck size={18}/>}
                            {t("authGate.cta.verify")}
                        </button>

                        {purpose === "link_guest" && !!hint ? (
                            <button
                                type="button"
                                onClick={() => void sendCode("merge_into_existing")}
                                disabled={loading}
                                className="w-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Merge size={18}/>
                                {t("authGate.cta.merge")}
                            </button>
                        ) : null}

                        <p className="text-center text-xs text-stone-400 pt-1">{t("authGate.privacy")}</p>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
