import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Lock, X, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/router";

type Props = {
    /** Si présent, on associe le job (photo+video) à cet email */
    jobId?: string | null;
    /** Optionnel: callback après authentification réussie */
    onAuthed?: (email: string) => void;
};

type StartResp =
    | { mode: "created"; authed: true; email: string }
    | { mode: "code_sent"; authed: false; email: string };

export default function AuthModal({ onAuthed }: Props) {
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

    const afterAuth = async (finalEmail: string) => {
        onAuthed?.(finalEmail);
        await close();
        await router.push("/studio");
    };


    const close = async () => {
        const q = { ...router.query };
        delete q.auth;
        await router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
    };

    const submitEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const r = await fetch("/api/auth/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, jobId: jobId || null }),
            });

            const data = (await r.json());
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code, jobId: jobId || null }),
            });

            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Erreur");

            onAuthed?.(email);
            await close();
            await router.push("/studio");
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, jobId: jobId || null }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Erreur");
            // reste en step code
        } catch (err: any) {
            setError(err?.message || "Erreur");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />

            <div className="relative bg-slate-900 border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <button onClick={close} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                        <Lock size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                        {step === "email" ? "Sauvegarder votre création" : "Vérification"}
                    </h3>
                    <p className="text-slate-400 text-sm">
                        {step === "email"
                            ? "Entrez votre email pour télécharger votre vidéo HD et accéder au studio."
                            : "Un code vient d’être envoyé à votre email. Saisissez-le pour vous connecter."}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                {step === "email" ? (
                    <form onSubmit={submitEmail} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    placeholder="nom@entreprise.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-9 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? "Chargement..." : "Accéder au téléchargement"} <ArrowRight size={18} />
                        </button>

                        <p className="text-center text-xs text-slate-600 pt-2">
                            Gratuit et sans engagement.
                        </p>
                    </form>
                ) : (
                    <form onSubmit={submitCode} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code (6 chiffres)</label>
                            <input
                                inputMode="numeric"
                                pattern="[0-9]*"
                                required
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono tracking-widest text-center"
                            />
                            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                                <span>Envoyé à: <span className="text-slate-300 font-mono">{email}</span></span>
                                <button
                                    type="button"
                                    onClick={resend}
                                    disabled={loading}
                                    className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2 disabled:opacity-60"
                                >
                                    Renvoyer
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || code.length !== 6}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? "Vérification..." : "Valider"} <ShieldCheck size={18} />
                        </button>
                    </form>
                )}
            </div>
            <button
                type="button"
                onClick={() => {
                    const jid = jobId ? `?jobId=${encodeURIComponent(String(jobId))}` : "";
                    window.location.href = `/api/auth/google/start${jid}`;
                }}
                disabled={loading}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-lg transition-all"
            >
                Continuer avec Google
            </button>

        </div>
    );
}
