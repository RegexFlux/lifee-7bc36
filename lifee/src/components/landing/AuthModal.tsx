import React, {useEffect, useMemo, useState} from "react";
import {ArrowRight, Lock, X, Mail, ShieldCheck, Gift} from "lucide-react";
import {useRouter} from "next/router";

type Props = {
    /** Si présent, on associe le job (photo+video) à cet email */
    jobId?: string | null;
    /** Optionnel: callback après authentification réussie */
    onAuthed?: (email: string) => void;
};

type StartResp =
    | { mode: "created"; authed: true; email: string }
    | { mode: "code_sent"; authed: false; email: string };

export default function AuthModal({onAuthed}: Props) {
    const bonusCode = 'BIEVENUE';
    const router = useRouter();
    const isOpen = useMemo(() => String(router.query.auth || "") === "1", [router.query.auth]);
    const jobId = useMemo(() => router.query.jobId, [router.query.jobId]);

    const [step, setStep] = useState<"email" | "code">("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const handleGoogleLogin = () => {
        const jid = jobId ? `?jobId=${encodeURIComponent(String(jobId))}` : "";
        window.location.href = `/api/auth/google/start${jid}`;
    };

    const submitEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const r = await fetch("/api/auth/start", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email, jobId: jobId || null}),
            });

            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Erreur");

            const resp = data as StartResp;

            if (resp.mode === "created") {
                await afterAuth(resp.email);
                return;
            }
            setStep("code");
        } catch (err: any) {
            setError(err?.message || "Erreur");
        } finally {
            setLoading(false);
        }
    };

    const submitCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const r = await fetch("/api/auth/verify", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email, code, jobId: jobId || null}),
            });

            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Erreur");

            await afterAuth(email);
        } catch (err: any) {
            setError(err?.message || "Erreur");
        } finally {
            setLoading(false);
        }
    };

    const resend = async () => {
        setError(null);
        setLoading(true);
        try {
            const r = await fetch("/api/auth/start", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email, jobId: jobId || null}),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Erreur");
            // stay on code step
        } catch (err: any) {
            setError(err?.message || "Erreur");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

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
                    <h3 className="text-2xl font-serif text-stone-900 mb-2">
                        {step === "email" ? "Sécurisez vos souvenirs" : "Vérification"}
                    </h3>
                    <p className="text-stone-500 text-sm">
                        {step === "email"
                            ? "Créez votre compte pour sauvegarder vos créations et accéder au studio."
                            : "Un code vient d’être envoyé à votre email. Saisissez-le pour vous connecter."}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                {/* Bonus banner (only on email step) */}
                {step === "email" && (
                    <div
                        className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-4 mb-6 shadow-sm">
                        {/* halo */}
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
                                    Bonus activé <span
                                    className="ml-1 align-middle inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
          - 30%
        </span>
                                </p>

                                <p className="mt-0.5 text-xs leading-relaxed text-stone-600">
                                    <span className="font-semibold text-stone-800">30% de réduction</span> offert avec le code <span className="font-semibold text-stone-800">{bonusCode}</span>
                                </p>
                            </div>
                        </div>

                        {/* mini barre */}
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
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Continuer avec Google
                            </button>

                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-stone-200"/>
                                </div>
                                <span
                                    className="relative bg-white px-4 text-xs text-stone-400 uppercase tracking-widest">
                  Ou via email
                </span>
                            </div>
                        </div>

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
                                {loading ? "Chargement..." : "Accéder au Studio"} <ArrowRight size={18}/>
                            </button>

                            <p className="text-center text-xs text-stone-400 pt-2">Vos données restent 100% privées.</p>
                        </form>
                    </>
                ) : (
                    <form onSubmit={submitCode} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Code (6
                                chiffres)</label>
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

            {/* --- CSS UTILS --- */}
            <style>{`
        @keyframes zoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
      `}</style>
        </div>
    );
}
