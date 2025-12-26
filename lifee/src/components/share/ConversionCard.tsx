// File: src/components/share/ConversionCard.tsx
"use client";

import React from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {Copy, CheckCircle2, Share2, Lock} from "lucide-react";

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            return true;
        } catch {
            return false;
        }
    }
}

export function ConversionCard(props: {
    canReplay: boolean;
    statusLine: string;
    progress: number;
    shareUrl?: string | null;
    onUnlock: () => void;
    createdAt?: string | null;
    variant?: "light" | "dark";
}) {
    const reduced = useReducedMotion();

    // ✅ SSR-stable: default false, set after mount
    const [mounted, setMounted] = React.useState(false);
    const [canNativeShare, setCanNativeShare] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        setCanNativeShare(typeof navigator !== "undefined" && typeof (navigator as any).share === "function");
    }, []);

    const [copied, setCopied] = React.useState(false);

    const doCopy = async () => {
        if (!props.shareUrl) return;
        setCopied(false);
        const ok = await copyText(props.shareUrl);
        setCopied(ok);
        if (ok) window.setTimeout(() => setCopied(false), 1200);
    };

    const doNativeShare = async () => {
        if (!props.shareUrl) return;
        if (!mounted || !canNativeShare) {
            // fallback
            window.open(props.shareUrl, "_blank", "noopener,noreferrer");
            return;
        }
        try {
            await (navigator as any).share({
                title: "Lifee",
                text: props.statusLine,
                url: props.shareUrl,
            });
        } catch {
            // user canceled
        }
    };

    const isLight = props.variant !== "dark";

    return (
        <div
            className={cx(
                "rounded-3xl border shadow-sm backdrop-blur",
                isLight ? "border-stone-200 bg-white/70" : "border-stone-700 bg-stone-900/40"
            )}
        >
            <div className="p-6 space-y-6">
                <div>
                    <div className={cx("text-sm font-black", isLight ? "text-stone-900" : "text-white")}>
                        {props.canReplay ? "Prêt à partager" : "En préparation"}
                    </div>
                    <div className={cx("mt-1 text-xs", isLight ? "text-stone-600" : "text-stone-300")}>
                        {props.statusLine}
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-stone-200 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-[width]"
                            style={{width: `${Math.max(0, Math.min(100, props.progress || 0))}%`}}
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={props.onUnlock}
                    className={cx(
                        "w-full rounded-2xl px-4 py-3 text-sm font-black transition inline-flex items-center justify-center gap-2",
                        isLight
                            ? "bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.99]"
                            : "bg-white/90 text-stone-900 hover:bg-white active:scale-[0.99]"
                    )}
                >
                    <Lock size={16}/>
                    Sauvegarder / Export / Studio
                </button>

                {/* ✅ IMPORTANT: this block now depends ONLY on props.shareUrl (SSR-stable) */}
                {props.shareUrl ? (
                    <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
                        <div className="text-[11px] font-semibold text-stone-700">Lien de partage</div>

                        <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[12px] font-mono text-stone-700">{props.shareUrl}</div>
                            </div>

                            <button
                                type="button"
                                onClick={doCopy}
                                className="shrink-0 inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-black hover:bg-stone-50 active:scale-[0.99]"
                            >
                                {copied ? <CheckCircle2 size={16}/> : <Copy size={16}/>}
                                {copied ? "Copié" : "Copier"}
                            </button>
                        </div>

                        {/* ✅ SSR-stable: button is always rendered; behavior changes after mount */}
                        <button
                            type="button"
                            onClick={doNativeShare}
                            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-black hover:bg-stone-50 active:scale-[0.99]"
                        >
                            <Share2 size={16}/>
                            {mounted && canNativeShare ? "Partager…" : "Ouvrir"}
                        </button>

                        <AnimatePresence>
                            {!mounted ? (
                                <motion.div
                                    initial={{opacity: 0}}
                                    animate={{opacity: 1}}
                                    exit={{opacity: 0}}
                                    transition={{duration: reduced ? 0 : 0.15}}
                                    className="mt-2 text-[11px] text-stone-500"
                                >
                                    Chargement des options de partage…
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
