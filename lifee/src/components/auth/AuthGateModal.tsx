// File: src/components/auth/AuthGateModal.tsx
"use client";


import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {Mail, ShieldCheck, X, Loader2, Lock} from "lucide-react";

import {useT} from "@/lib/i18n/useT";
import {fetchJson, HttpError, isValidEmail} from "@/components/landing/interactiveDemo/utils";
import type {AuthGateReason} from "@/hooks/useAuthGate";


type SendCodeResp =
    | { mode: "code_sent"; email: string }
    | { mode: "authed"; email: string };

type VerifyCodeResp =
    | { ok: true; email: string }
    | { email: string };

type LinkResp =
    | { ok: true; email: string }
    | { email: string };

export function AuthGateModal(props: {
    open: boolean;
    reason: AuthGateReason;
    onClose: () => void;
    onSuccess: (email: string) => void;
}) {
    const reduce = useReducedMotion();
    const {t} = useT();

    const [step, setStep] = useState<"email" | "code">("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const emailRef = useRef<HTMLInputElement | null>(null);
    const codeRef = useRef<HTMLInputElement | null>(null);

    const title = useMemo(() => {
        if (props.reason === "export") return t("authGate.title.export");
        if (props.reason === "share") return t("authGate.title.share");
        return t("authGate.title.save");
    }, [props.reason, t]);

    const subtitle = useMemo(() => {
        if (step === "email") {
            if (props.reason === "export") return t("authGate.subtitle.export");
            if (props.reason === "share") return t("authGate.subtitle.share");
            return t("authGate.subtitle.save");
        }
        return t("authGate.subtitle.code");
    }, [props.reason, step, t]);

    useEffect(() => {
        if (!props.open) {
            setStep("email");
            setEmail("");
            setCode("");
            setLoading(false);
            setError(null);
            return;
        }
        const tmr = window.setTimeout(() => emailRef.current?.focus(), 60);
        return () => window.clearTimeout(tmr);
    }, [props.open]);

    useEffect(() => {
        if (!props.open) return;

        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") props.onClose();
        };
        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [props.open, props.onClose]);

    const sendCode = async () => {
        setError(null);
        const trimmed = email.trim();

        if (!isValidEmail(trimmed)) {
            setError(t("authGate.error.invalidEmail"));
            return;
        }

        setLoading(true);
        try {
            const resp = await fetchJson<SendCodeResp>("/api/auth/email/send-code", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email: trimmed, purpose: "link_guest"}),
            });

            // si le back décide d’auth direct (rare), on finalise
            if ((resp as any)?.mode === "authed") {
                props.onSuccess((resp as any).email || trimmed);
                return;
            }

            setStep("code");
            window.setTimeout(() => codeRef.current?.focus(), 60);
        } catch (e: any) {
            if (e instanceof HttpError) setError(e.message || t("authGate.error.generic"));
            else setError(e?.message || t("authGate.error.generic"));
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async () => {
        setError(null);

        const trimmedEmail = email.trim();
        if (!isValidEmail(trimmedEmail)) {
            setError(t("authGate.error.invalidEmail"));
            setStep("email");
            return;
        }
        if (code.trim().length !== 6) {
            setError(t("authGate.error.invalidCode"));
            return;
        }

        setLoading(true);
        try {
            await fetchJson<VerifyCodeResp>("/api/auth/email/verify-code", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email: trimmedEmail, code: code.trim(), purpose: "link_guest"}),
            });

            // ✅ lie le guest courant (cookie lifee_session) à cet email
            const linked = await fetchJson<LinkResp>("/api/auth/email/link", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email: trimmedEmail}),
            });

            props.onSuccess((linked as any)?.email || trimmedEmail);
        } catch (e: any) {
            if (e instanceof HttpError) setError(e.message || t("authGate.error.generic"));
            else setError(e?.message || t("authGate.error.generic"));
        } finally {
            setLoading(false);
        }
    };

    const resend = async () => {
        setError(null);
        setLoading(true);
        try {
            await fetchJson<SendCodeResp>("/api/auth/email/send-code", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email: email.trim(), purpose: "link_guest"}),
            });
        } catch (e: any) {
            if (e instanceof HttpError) setError(e.message || t("authGate.error.generic"));
            else setError(e?.message || t("authGate.error.generic"));
        } finally {
            setLoading(false);
        }
    };

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={props.onClose}/>

            <AnimatePresence>
                <motion.div
                    initial={reduce ? {opacity: 0} : {opacity: 0, y: 10, scale: 0.99}}
                    animate={reduce ? {opacity: 1} : {opacity: 1, y: 0, scale: 1}}
                    exit={reduce ? {opacity: 0} : {opacity: 0, y: 10, scale: 0.99}}
                    transition={{duration: 0.18}}
                    className="relative bg-white p-6 sm:p-7 rounded-2xl w-full max-w-md shadow-2xl border border-stone-200"
                >
                    <button onClick={props.onClose} className="absolute top-3 right-3 p-2 rounded-xl hover:bg-stone-50">
                        <X size={18} className="text-stone-600"/>
                    </button>

                    <div className="text-center mb-5">
                        <div
                            className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-500">
                            <Lock size={24}/>
                        </div>
                        <h3 className="text-xl font-serif text-stone-900">{title}</h3>
                        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
                    </div>

                    {error && (
                        <div
                            className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

                    {step === "email" ? (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                void sendCode();
                            }}
                            className="space-y-3"
                        >
                            <label
                                className="block text-xs font-bold text-stone-500 uppercase">{t("authGate.emailLabel")}</label>

                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-stone-400" size={18}/>
                                <input
                                    ref={emailRef}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email"
                                    required
                                    placeholder={t("authGate.emailPlaceholder")}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg py-3 pl-10 pr-3 text-stone-800 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin"/> {t("authGate.sending")}
                                    </>
                                ) : (
                                    t("authGate.sendCode")
                                )}
                            </button>

                            <p className="text-center text-xs text-stone-400 pt-1">{t("authGate.privacy")}</p>
                        </form>
                    ) : (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                void verifyCode();
                            }}
                            className="space-y-3"
                        >
                            <label
                                className="block text-xs font-bold text-stone-500 uppercase">{t("authGate.codeLabel")}</label>

                            <input
                                ref={codeRef}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                required
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-3 px-3 text-stone-800 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all font-mono tracking-widest text-center"
                            />

                            <div className="text-xs text-stone-500 flex items-center justify-between">
                <span>
                  {t("authGate.sentTo")} <span className="text-stone-800 font-mono">{email.trim()}</span>
                </span>
                                <button
                                    type="button"
                                    onClick={() => void resend()}
                                    disabled={loading}
                                    className="text-stone-700 hover:text-stone-900 underline underline-offset-2 disabled:opacity-60"
                                >
                                    {t("authGate.resend")}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin"/> {t("authGate.verifying")}
                                    </>
                                ) : (
                                    <>
                                        {t("authGate.verify")} <ShieldCheck size={18}/>
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-stone-400 pt-1">{t("authGate.privacy")}</p>
                        </form>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
