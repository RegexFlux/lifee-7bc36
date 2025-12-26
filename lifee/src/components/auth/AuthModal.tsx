// File: src/components/auth/AuthModal.tsx
"use client";

import React, {useEffect, useMemo, useState} from "react";
import {ArrowRight, Lock, X, Mail, ShieldCheck, Gift, Merge, UserPlus} from "lucide-react";
import {useRouter} from "next/router";
import {z} from "zod";

import {apiPost, ApiError} from "@/lib/api/client";
import {useViewer, emitViewerRefresh} from "@/lib/auth/useViewer";
import {useT} from "@/lib/i18n/useT";

type Purpose = "login" | "change_email" | "link_guest" | "merge_into_existing";
const PURPOSES = ["login", "change_email", "link_guest", "merge_into_existing"] as const;

type Props = { onAuthed?: (email: string) => void };

const SendBody = z.object({email: z.string().email(), purpose: z.enum(PURPOSES)});
const VerifyBody = z.object({email: z.string().email(), purpose: z.enum(PURPOSES), code: z.string().regex(/^\d{6}$/)});

export default function AuthModal({onAuthed}: Props) {
    const bonusCode = "JACKPOT25";
    const router = useRouter();
    const {viewer} = useViewer();
    const {t} = useT();

    const isOpen = useMemo(() => String(router.query.auth || "") === "1", [router.query.auth]);
    const generationId = useMemo(() => router.query.generationId, [router.query.generationId]); // conservé
    const queryPurpose = useMemo(() => String(router.query.purpose || ""), [router.query.purpose]);

    const inferredPurpose: Purpose = useMemo(() => {
        if (PURPOSES.includes(queryPurpose as any)) return queryPurpose as Purpose;
        if (viewer?.user?.type === "guest") return "link_guest";
        return "login";
    }, [queryPurpose, viewer?.user?.type]);

    const [step, setStep] = useState<"email" | "code">("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestMerge, setSuggestMerge] = useState(false);

    const close = async () => {
        const q = {...router.query};
        delete q.auth;
        delete q.purpose;
        await router.replace({pathname: router.pathname, query: q}, undefined, {shallow: true});
    };

    const afterAuth = async (finalEmail: string) => {
        emitViewerRefresh();
        onAuthed?.(finalEmail);
        await close();
    };

    useEffect(() => {
        if (!isOpen) {
            setStep("email");
            setEmail("");
            setCode("");
            setLoading(false);
            setError(null);
            setSuggestMerge(false);
        }
    }, [isOpen]);

    const handleGoogleLogin = () => {
        const jid = generationId ? `?generationId=${encodeURIComponent(String(generationId))}` : "";
        window.location.href = `/api/auth/google/start${jid}`;
    };

    const submitEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuggestMerge(false);
        setLoading(true);
        try {
            const p = inferredPurpose;
            SendBody.parse({email, purpose: p});
            await apiPost("/api/auth/email/send-code", {email, purpose: p});
            setStep("code");
            setCode("");
        } catch (err: any) {
            const msg = err instanceof ApiError ? err.message : err?.message || "Error";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const submitCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuggestMerge(false);
        setLoading(true);
        try {
            const p = inferredPurpose;
            VerifyBody.parse({email, purpose: p, code});
            await apiPost("/api/auth/email/verify-code", {email, purpose: p, code});
            await afterAuth(email);
        } catch (err: any) {
            const apiErr = err instanceof ApiError ? err : null;
            if (apiErr?.status === 409 && inferredPurpose === "link_guest") {
                setSuggestMerge(true);
                setError(t("auth.merge_error"));
            } else {
                setError(apiErr ? apiErr.message : err?.message || "Error");
            }
        } finally {
            setLoading(false);
        }
    };

    const resend = async () => {
        setError(null);
        setSuggestMerge(false);
        setLoading(true);
        try {
            const p = inferredPurpose;
            SendBody.parse({email, purpose: p});
            await apiPost("/api/auth/email/send-code", {email, purpose: p});
        } catch (err: any) {
            setError(err instanceof ApiError ? err.message : err?.message || "Error");
        } finally {
            setLoading(false);
        }
    };

    const switchToMerge = async () => {
        setError(null);
        setLoading(true);
        try {
            await apiPost("/api/auth/email/send-code", {email, purpose: "merge_into_existing"});
            const q = {...router.query, purpose: "merge_into_existing"};
            await router.replace({pathname: router.pathname, query: q}, undefined, {shallow: true});
            setStep("code");
            setCode("");
            setSuggestMerge(false);
        } catch (err: any) {
            setError(err instanceof ApiError ? err.message : err?.message || "Error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const badge =
        inferredPurpose === "login"
            ? {icon: <Lock size={14}/>, label: t("auth.badge.login")}
            : inferredPurpose === "change_email"
                ? {icon: <Mail size={14}/>, label: t("auth.badge.change_email")}
                : inferredPurpose === "link_guest"
                    ? {icon: <UserPlus size={14}/>, label: t("auth.badge.link_guest")}
                    : {icon: <Merge size={14}/>, label: t("auth.badge.merge_into_existing")};

    const title = step === "email" ? t("auth.title_email") : t("auth.title_code");
    const desc = step === "email" ? t("auth.desc_email") : t("auth.desc_code");

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={close}/>

            <div
                className="relative bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <button onClick={close} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
                    <X size={20}/>
                </button>

                <div className="text-center mb-6">
                    <div
                        className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                        <Lock size={28}/>
                    </div>

                    <div className="mb-2 flex items-center justify-center gap-2">
            <span
                className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-[11px] font-bold text-stone-700">
              {badge.icon}
                {badge.label}
            </span>
                    </div>

                    <h3 className="text-2xl font-serif text-stone-900 mb-2">{title}</h3>
                    <p className="text-stone-500 text-sm">{desc}</p>
                </div>

                {error && (
                    <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                {suggestMerge && (
                    <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 rounded-2xl bg-stone-900 p-2 text-white shadow-sm">
                                <Merge size={16}/>
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-stone-900">{t("auth.merge_title")}</div>
                                <div
                                    className="mt-0.5 text-xs leading-relaxed text-stone-600">{t("auth.merge_body")}</div>
                                <div className="mt-3 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={switchToMerge}
                                        disabled={loading}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-60"
                                    >
                                        {t("auth.merge_cta")} <ArrowRight size={14}/>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSuggestMerge(false)}
                                        disabled={loading}
                                        className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                                    >
                                        {t("auth.other_email")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === "email" && (
                    <div
                        className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-4 mb-6 shadow-sm">
                        <div
                            className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-amber-200/40 blur-3xl"/>
                        <div
                            className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-rose-200/30 blur-3xl"/>

                        <div className="relative flex items-start gap-3">
                            <div
                                className="shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-400 p-2 shadow-md">
                                <Gift size={18} className="text-white"/>
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-stone-900">
                                    {t("bonus.title")}{" "}
                                    <span
                                        className="ml-1 align-middle inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    {t("bonus.badge")}
                  </span>
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-stone-600">
                                    {t("bonus.body", {code: bonusCode})}
                                </p>
                            </div>
                        </div>

                        <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                            <div
                                className="h-full w-2/3 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-rose-400"/>
                        </div>
                    </div>
                )}

                {step === "email" ? (
                    <>
                        <div className="space-y-4 mb-6">
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full py-3 rounded-xl border border-stone-200 flex items-center justify-center gap-3 hover:bg-stone-50 transition-colors text-stone-700 font-medium group"
                            >
                                {/* svg inchangé */}
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"/>
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"/>
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"/>
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"/>
                                </svg>
                                {t("auth.google")}
                            </button>

                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-stone-200"/>
                                </div>
                                <span
                                    className="relative bg-white px-4 text-xs text-stone-400 uppercase tracking-widest">
                  {t("auth.or_email")}
                </span>
                            </div>
                        </div>

                        <form onSubmit={submitEmail} className="space-y-4">
                            <div>
                                <label
                                    className="block text-xs font-bold text-stone-500 uppercase mb-1">{t("auth.label_email")}</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-stone-400" size={18}/>
                                    <input
                                        type="email"
                                        required
                                        placeholder={t("auth.placeholder_email")}
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
                                {loading ? t("auth.loading") : t("auth.cta_continue")} <ArrowRight size={18}/>
                            </button>

                            <p className="text-center text-xs text-stone-400 pt-2">{t("auth.privacy")}</p>
                        </form>
                    </>
                ) : (
                    <form onSubmit={submitCode} className="space-y-4">
                        <div>
                            <label
                                className="block text-xs font-bold text-stone-500 uppercase mb-1">{t("auth.label_code")}</label>
                            <input
                                inputMode="numeric"
                                pattern="[0-9]*"
                                required
                                placeholder={t("auth.placeholder_code")}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-3 px-3 text-stone-800 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all font-mono tracking-widest text-center"
                            />
                            <div className="mt-2 text-xs text-stone-500 flex items-center justify-between">
                <span className="truncate">
                  {t("auth.sent_to", {email})}
                </span>
                                <button
                                    type="button"
                                    onClick={resend}
                                    disabled={loading}
                                    className="text-stone-700 hover:text-stone-900 underline underline-offset-2 disabled:opacity-60"
                                >
                                    {t("auth.resend")}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || code.length !== 6}
                            className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? t("auth.validating") : t("auth.validate")} <ShieldCheck size={18}/>
                        </button>

                        <p className="text-center text-xs text-stone-400 pt-2">{t("auth.privacy")}</p>
                    </form>
                )}
            </div>
        </div>
    );
}
