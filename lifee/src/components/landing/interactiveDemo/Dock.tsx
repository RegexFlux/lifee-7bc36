import { Mail, Send, Loader2, CheckCircle2, AlertTriangle, ExternalLink, X, Film } from "lucide-react";
import {useReducedMotion} from "framer-motion";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {DemoState} from "@/components/landing/InteractiveDemo";
import {cx} from "@/components/effects/StudioOpening";
import {EmailSharePopover} from "@/components/EmailSharePopover";

function glassPillBase() {
    // ✅ identique à l'esthétique du MiniAudioWidget
    return "rounded-2xl border border-stone-200 bg-white/90 backdrop-blur px-3 py-2 shadow-sm";
}

export default function Dock({
                  open,
                  state,
                  jobId,
                  shareUrl,
                  videoUrl,
                  error,
                  onOpenResult,
                  onOpenShare,
                  onClear,
              }: {
    open: boolean;
    state: DemoState;
    jobId: string | null;
    shareUrl: string | null;
    videoUrl: string | null;
    error: string | null;
    onOpenResult: () => void;
    onOpenShare: () => void;
    onClear: () => void;
}) {
    const reduced = useReducedMotion();

    const [emailOpen, setEmailOpen] = React.useState(false);
    const [email, setEmail] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const [sent, setSent] = React.useState(false);
    const [emailErr, setEmailErr] = React.useState<string | null>(null);

    const show = open && (state !== "idle" || !!jobId);

    const icon =
        state === "analyzing" || state === "generating" ? (
            <Loader2 className="h-4 w-4 animate-spin text-stone-700" />
        ) : state === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : state === "failed" ? (
            <AlertTriangle className="h-4 w-4 text-rose-600" />
        ) : (
            <Film className="h-4 w-4 text-stone-700" />
        );

    const title =
        state === "analyzing"
            ? "Préparation…"
            : state === "generating"
                ? "Génération en cours"
                : state === "success"
                    ? "Vidéo prête"
                    : state === "failed"
                        ? "Erreur"
                        : "Démo";

    const subtitle =
        state === "analyzing"
            ? "Upload & analyse"
            : state === "generating"
                ? "Vous pouvez continuer à naviguer"
                : state === "success"
                    ? "Ouvrir le résultat"
                    : state === "failed"
                        ? (error || "La génération a échoué")
                        : jobId
                            ? "Reprendre votre dernier job"
                            : null;

    const canEmail = !!shareUrl; // on envoie le lien (stable) plutôt que videoUrl (souvent expirable)

    const isEmailValid = (v: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

    const sendEmail = async () => {
        if (!shareUrl) return;
        const to = email.trim();
        setEmailErr(null);
        setSent(false);

        if (!isEmailValid(to)) {
            setEmailErr("Email invalide.");
            return;
        }

        setSending(true);
        try {
            const r = await fetch("/api/lifee/demo/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to,
                    shareUrl,
                    jobId,
                }),
            });

            const data = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(data?.error || "Envoi impossible");

            setSent(true);
            setEmailErr(null);
            // mini auto-close (facultatif)
            window.setTimeout(() => setEmailOpen(false), 1200);
        } catch (e: any) {
            setEmailErr(e?.message || "Erreur lors de l’envoi.");
        } finally {
            setSending(false);
        }
    };

    return (
        <AnimatePresence>
            {jobId && (
                <EmailSharePopover jobId={jobId} />
            )}
            {show && (
                <motion.div
                    className="fixed right-4 sm:right-6 top-21 z-[80]"
                    initial={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(8px)" }}
                    transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="relative">
                        {/* Main pill */}
                        <div className={cx(glassPillBase(), "max-w-[340px] flex items-start gap-3")}>
                            <div className="mt-0.5">{icon}</div>

                            <div className="min-w-0">
                                <div className="text-xs font-semibold text-stone-800">{title}</div>
                                {subtitle && <div className="text-[11px] text-stone-600 mt-0.5">{subtitle}</div>}

                                <div className="mt-2 flex items-center gap-2">
                                    {(state === "success" || (state !== "idle" && !!videoUrl)) && (
                                        <button
                                            onClick={onOpenResult}
                                            className="rounded-xl border border-stone-200 bg-white/80 hover:bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-800 transition active:scale-[0.98]"
                                        >
                                            Ouvrir
                                        </button>
                                    )}

                                    {shareUrl && (
                                        <button
                                            onClick={onOpenShare}
                                            className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white/80 hover:bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-800 transition active:scale-[0.98]"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Lien
                                        </button>
                                    )}

                                    {/* NEW: Email */}
                                    {canEmail && (
                                        <button
                                            onClick={() => {
                                                setEmailErr(null);
                                                setSent(false);
                                                setEmailOpen((v) => !v);
                                            }}
                                            className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white/80 hover:bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-800 transition active:scale-[0.98]"
                                            aria-label="Envoyer par email"
                                            title="Envoyer par email"
                                        >
                                            <Mail className="h-3.5 w-3.5" />
                                            Email
                                        </button>
                                    )}

                                    <button
                                        onClick={onClear}
                                        className="ml-auto rounded-xl border border-stone-200 bg-white/70 hover:bg-white px-2 py-1.5 text-[11px] font-semibold text-stone-600 transition active:scale-[0.98]"
                                        aria-label="Masquer"
                                        title="Masquer"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Email popover */}
                        <AnimatePresence>
                            {emailOpen && canEmail && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6, scale: 0.98, filter: "blur(8px)" }}
                                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -6, scale: 0.98, filter: "blur(8px)" }}
                                    transition={{ duration: reduced ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                                    className="absolute right-0 mt-2 w-[340px]"
                                >
                                    <div className={cx(glassPillBase(), "p-3")}>
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-semibold text-stone-800">Envoyer par email</div>
                                            <button
                                                onClick={() => setEmailOpen(false)}
                                                className="rounded-xl border border-stone-200 bg-white hover:bg-white p-1.5 transition"
                                                aria-label="Fermer email"
                                            >
                                                <X className="h-4 w-4 text-stone-700" />
                                            </button>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    setEmailErr(null);
                                                    setSent(false);
                                                }}
                                                placeholder="nom@domaine.com"
                                                className="h-10 w-full rounded-xl border border-stone-200 bg-white/85 px-3 text-[12px] font-semibold text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-300/60"
                                                inputMode="email"
                                                autoComplete="email"
                                            />

                                            <button
                                                onClick={sendEmail}
                                                disabled={sending || !isEmailValid(email)}
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

                                        {emailErr && <div className="mt-2 text-[11px] font-semibold text-rose-600">{emailErr}</div>}

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
                </motion.div>
            )}
        </AnimatePresence>
    );
}
