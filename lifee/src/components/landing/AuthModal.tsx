// File: src/components/auth/AuthModal.tsx
"use client";

import React, {useEffect, useMemo, useState} from "react";
import {ArrowRight, Lock, X, Mail, ShieldCheck, Gift, Merge, UserPlus} from "lucide-react";
import {useRouter} from "next/router";
import {apiPost, ApiError} from "@/lib/api/client";
import {z} from "zod";

type Props = {
    /** Optionnel: callback après auth réussie */
    onAuthed?: (email: string) => void;
    /**
     * Par défaut, on choisit link_guest (si guest) sinon login.
     * Tu peux forcer un mode (ex: change_email depuis settings).
     */
    purpose?: "login" | "change_email" | "link_guest" | "merge_into_existing";
};

const SendBody = z.object({
    email: z.string().email(),
    purpose: z.enum(["login", "change_email", "link_guest", "merge_into_existing"]),
});

const VerifyBody = z.object({
    email: z.string().email(),
    purpose: z.enum(["login", "change_email", "link_guest", "merge_into_existing"]),
    code: z.string().regex(/^\d{6}$/),
});

function isGuestEmail(email: string) {
    return email.endsWith("@lifee.invalid");
}

export default function AuthModal({onAuthed, purpose}: Props) {
    const bonusCode = "JACKPOT25";
    const router = useRouter();

    const isOpen = useMemo(() => String(router.query.auth || "") === "1", [router.query.auth]);
    const jobId = useMemo(() => router.query.jobId, [router.query.jobId]); // conservé

    const [step, setStep] = useState<"email" | "code">("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // mode choisi (UI) : si guest => link_guest par défaut, sinon login
    // Si tu as un endpoint viewer, tu peux l’injecter et rendre ça plus exact.
    const inferredPurpose = useMemo(() => {
        if (purpose) return purpose;
        // heuristique simple: si on a déjà un email saisi => login
        return "login";
    }, [purpose]);

    const close = async () => {
        const q = {...router.query};
        delete q.auth;
        await router.replace({pathname: router.pathname, query: q}, undefined, {shallow: true});
    };

    const afterAuth = async (finalEmail: string) => {
        onAuthed?.(finalEmail);
        await close();
        await router.push("/studio");
    };

    // reset when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setStep("email");
            setEmail("");
            setCode("");
            setLoading(false);
            setError(null);
        }
    }, [isOpen]);

    const submitEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // 결정: purpose réel
            // - Si le user saisit un email et que c’est un “upgrade guest” flow:
            //   -> on commence par link_guest (et si verify renvoie 409 email used, on bascule merge_into_existing)
            const p = inferredPurpose;

            SendBody.parse({email, purpose: p});

            await apiPost("/api/auth/email/send-code", {email, purpose: p});
            setStep("code");
        } catch (err: any) {
            const msg = err instanceof ApiError ? err.message : err?.message || "Erreur";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const submitCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const p = inferredPurpose;
            VerifyBody.parse({email, purpose: p, code});

            await apiPost("/api/auth/email/verify-code", {email, purpose: p, code});

            await afterAuth(email);
        } catch (err: any) {
            const msg = err instanceof ApiError ? err.message : err?.message || "Erreur";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const resend = async () => {
        setError(null);
        setLoading(true);
        try {
            const p = inferredPurpose;
            SendBody.parse({email, purpose: p});
            await apiPost("/api/auth/email/send-code", {email, purpose: p});
        } catch (err: any) {
            const msg = err instanceof ApiError ? err.message : err?.message || "Erreur";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const title =
        step === "email"
            ? "Sécurisez vos souvenirs"
            : "Vérification";

    const desc =
        step === "email"
            ? "Ajoutez un email pour sauvegarder vos créations et accéder au studio sur tous vos appareils."
            : "Un code vient d’être envoyé à votre email. Saisissez-le pour continuer.";

    const purposeBadge =
        inferredPurpose === "login"
            ? {icon: <Lock size={14}/>, label: "Connexion"}
            : inferredPurpose === "change_email"
                ? {icon: <Mail size={14}/>, label: "Changement d’email"}
                : inferredPurpose === "link_guest"
                    ? {icon: <UserPlus size={14}/>, label: "Associer le compte invité"}
                    : {icon: <Merge size={14}/>, label: "Fusionner vers un compte existant"};

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
              {purposeBadge.icon}
                {purposeBadge.label}
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
                                    Bonus activé{" "}
                                    <span
                                        className="ml-1 align-middle inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    - 25%
                  </span>
                                </p>

                                <p className="mt-0.5 text-xs leading-relaxed text-stone-600">
                                    <span className="font-semibold text-stone-800">30% de réduction</span> offert avec
                                    le code{" "}
                                    <span className="font-semibold text-stone-800">{bonusCode}</span>
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
                    <form onSubmit={submitEmail} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-stone-400" size={18}/>
                                <input
                                    type="email"
                                    required
                                    placeholder="votre@email.com"
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
                            {loading ? "Chargement..." : "Continuer"} <ArrowRight size={18}/>
                        </button>

                        <p className="text-center text-xs text-stone-400 pt-2">Vos données restent 100% privées.</p>
                    </form>
                ) : (
                    <form onSubmit={submitCode} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                                Code (6 chiffres)
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
                  Envoyé à: <span className="text-stone-800 font-mono">{email}</span>
                </span>
                                <button
                                    type="button"
                                    onClick={resend}
                                    disabled={loading}
                                    className="text-stone-700 hover:text-stone-900 underline underline-offset-2 disabled:opacity-60"
                                >
                                    Renvoyer
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || code.length !== 6}
                            className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? "Vérification..." : "Valider"} <ShieldCheck size={18}/>
                        </button>

                        <p className="text-center text-xs text-stone-400 pt-2">Vos données restent 100% privées.</p>
                    </form>
                )}
            </div>

            <style>{`
        @keyframes zoom { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }
      `}</style>
        </div>
    );
}
