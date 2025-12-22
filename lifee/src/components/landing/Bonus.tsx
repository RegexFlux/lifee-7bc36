import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";

type BonusProps = {
    onLoginClick: () => void;

    chance?: number;
    minDelayMs?: number;
    maxDelayMs?: number;

    /** Code bonus affiché + copiable */
    bonusCode?: string;

    /** Copie le code au clic (en plus du CTA). Par défaut: true */
    copyOnClick?: boolean;
};

export default function Bonus({
                                  onLoginClick,
                                  chance = 100,
                                  minDelayMs = 1200,
                                  maxDelayMs = 9000,
                                  bonusCode = "BIENVENUE",
                                  copyOnClick = true,
                              }: BonusProps) {
    const [showBonusToast, setShowBonusToast] = useState(false);
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;


        const safeChance = Number.isFinite(chance) ? Math.min(1, Math.max(0, chance)) : 0.35;
        const safeMin = Math.max(0, minDelayMs);
        const safeMax = Math.max(safeMin, maxDelayMs);

        if (Math.random() >= safeChance) return;

        const delay = safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
        timeoutRef.current = window.setTimeout(() => setShowBonusToast(true), delay);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chance, minDelayMs, maxDelayMs]);

    const copyCode = async () => {
        try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(bonusCode);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
            }
        } catch {
            // ignore
        }
    };

    const handlePrimaryClick = async () => {
        // Option: copier le code avant de rediriger vers signup/login
        if (copyOnClick) await copyCode();
        onLoginClick();
    };

    const handleCopyOnly = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await copyCode();
    };

    return (
        <div
            className={`fixed bottom-6 left-6 z-40 transition-all duration-700 transform ${
                showBonusToast ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
            }`}
            aria-hidden={!showBonusToast}
        >
            <div
                onClick={handlePrimaryClick}
                className="relative max-w-sm w-[340px] rounded-3xl overflow-hidden cursor-pointer group shadow-2xl border border-rose-100 bg-white"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handlePrimaryClick();
                }}
            >
                {/* Halo / fond */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-amber-50" />
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-rose-200/40 blur-3xl rounded-full" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-200/40 blur-3xl rounded-full" />

                <div className="relative p-4 flex gap-3">
                    {/* Icône */}
                    <div className="shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-400 text-white flex items-center justify-center text-2xl shadow-lg group-hover:rotate-6 transition-transform">
                            🎁
                        </div>
                    </div>

                    {/* Texte */}
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-stone-700">
                            Inscris-toi maintenant et reçois <span className="text-rose-600 font-extrabold">30% de réduction</span>
                        </p>

                        <p className="mt-0.5 text-xs text-stone-500">
                            Utilise le code{" "}
                            <span className="font-semibold text-stone-700">{bonusCode}</span> à l’inscription.
                        </p>

                        {/* Code + copier */}
                        <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-stone-900 text-white text-[11px] tracking-widest font-bold">
                {bonusCode}
              </span>

                            <button
                                type="button"
                                onClick={handleCopyOnly}
                                className="text-[11px] px-2 py-1 rounded-xl bg-white/70 border border-stone-200 text-stone-700 hover:bg-white transition"
                            >
                                {copied ? "Copié ✅" : "Copier"}
                            </button>

                            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                S’inscrire <ArrowRight size={14} />
              </span>
                        </div>
                    </div>
                </div>

                {/* Mini barre en bas */}
                <div className="relative h-1 w-full bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 opacity-80" />
            </div>
        </div>
    );
}
