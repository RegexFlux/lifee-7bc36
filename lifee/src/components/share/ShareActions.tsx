// File: src/components/share/ShareActions.tsx
"use client";

import React from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {
    Share2,
    Copy,
    CheckCircle2,
    X,
    Mail,
    MessageCircle,
    Send,
    Globe,
    Linkedin,
    Facebook,
} from "lucide-react";
import {useT} from "@/lib/i18n/useT";

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function pillBase() {
    return "rounded-2xl border border-stone-200 bg-white/80 backdrop-blur shadow-sm";
}

async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // fallback
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

function openPopup(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
}

function buildLinks(params: { url: string; title?: string; text?: string }) {
    const {url, title = "", text = ""} = params;
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(text || title || "");

    return {
        whatsapp: `https://wa.me/?text=${encodeURIComponent((text ? text + "\n" : "") + url)}`,
        telegram: `https://t.me/share/url?url=${u}&text=${t}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
        x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
        email: `mailto:?subject=${encodeURIComponent(title || "Lifee")}&body=${encodeURIComponent(
            (text ? text + "\n\n" : "") + url
        )}`,
        // “Messenger” et “Snapchat/Instagram Story” ne sont pas fiables en web sans app_id / media.
        // On les couvre via le Share Sheet mobile.
    };
}

export function ShareActions(props: {
    url: string;
    title?: string;
    text?: string;
    className?: string;
}) {
    const {t} = useT();
    const reduced = useReducedMotion();

    const [open, setOpen] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const canNativeShare =
        typeof navigator !== "undefined" &&
        // @ts-ignore
        typeof navigator.share === "function";

    const links = React.useMemo(
        () => buildLinks({url: props.url, title: props.title, text: props.text}),
        [props.url, props.title, props.text]
    );

    const doNativeShare = async () => {
        if (!canNativeShare) return;
        try {
            // @ts-ignore
            await navigator.share({
                title: props.title || "Lifee",
                text: props.text || "",
                url: props.url,
            });
        } catch {
            // user canceled -> ignore
        }
    };

    const doCopy = async () => {
        setCopied(false);
        const ok = await copyText(props.url);
        setCopied(ok);
        if (ok) window.setTimeout(() => setCopied(false), 1200);
    };

    return (
        <div className={cx("relative", props.className)}>
            {/* Mobile-first: gros bouton "Partager" (share sheet si dispo) */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        if (canNativeShare) return void doNativeShare();
                        setOpen((v) => !v);
                    }}
                    className={cx(
                        "flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
                        "bg-white/85 hover:bg-white border border-stone-200 active:scale-[0.99]"
                    )}
                >
                    <Share2 size={18}/>
                    {t("share.actions.share")}
                </button>

                {/* Desktop/backup: menu multi */}
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={cx(
                        "shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
                        "bg-white/85 hover:bg-white border border-stone-200 active:scale-[0.99]"
                    )}
                    aria-label={t("share.actions.more")}
                    title={t("share.actions.more")}
                >
                    <Globe size={18}/>
                </button>
            </div>

            <div className="mt-2 flex items-center gap-2 text-[11px] text-stone-500">
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={14}/>
            {t("share.actions.mobile_hint")}
        </span>
            </div>

            <AnimatePresence>
                {open ? (
                    <motion.div
                        initial={{opacity: 0, y: -6, scale: 0.98, filter: "blur(8px)"}}
                        animate={{opacity: 1, y: 0, scale: 1, filter: "blur(0px)"}}
                        exit={{opacity: 0, y: -6, scale: 0.98, filter: "blur(8px)"}}
                        transition={{duration: reduced ? 0 : 0.18, ease: [0.16, 1, 0.3, 1]}}
                        className="absolute right-0 mt-2 w-[360px] max-w-[92vw] z-[200]"
                    >
                        <div className={cx(pillBase(), "p-3")}>
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-stone-800">{t("share.actions.title")}</div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="rounded-xl border border-stone-200 bg-white/70 hover:bg-white p-1.5 transition"
                                    aria-label={t("share.actions.close")}
                                >
                                    <X className="h-4 w-4 text-stone-700"/>
                                </button>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={doCopy}
                                    className={cx(
                                        "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-black transition active:scale-[0.99]",
                                        "border-stone-200 bg-white/85 hover:bg-white text-stone-900"
                                    )}
                                >
                                    {copied ? <CheckCircle2 size={16}/> : <Copy size={16}/>}
                                    {copied ? t("share.actions.copied") : t("share.actions.copy")}
                                </button>

                                {canNativeShare ? (
                                    <button
                                        type="button"
                                        onClick={doNativeShare}
                                        className={cx(
                                            "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-black transition active:scale-[0.99]",
                                            "border-stone-200 bg-white/85 hover:bg-white text-stone-900"
                                        )}
                                    >
                                        <Share2 size={16}/>
                                        {t("share.actions.more_apps")}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => openPopup(links.email)}
                                        className={cx(
                                            "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-black transition active:scale-[0.99]",
                                            "border-stone-200 bg-white/85 hover:bg-white text-stone-900"
                                        )}
                                    >
                                        <Mail size={16}/>
                                        {t("share.actions.email")}
                                    </button>
                                )}
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => openPopup(links.whatsapp)}
                                    className="rounded-2xl border border-stone-200 bg-white/85 hover:bg-white px-3 py-2 text-[11px] font-black"
                                >
                                    WhatsApp
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openPopup(links.telegram)}
                                    className="rounded-2xl border border-stone-200 bg-white/85 hover:bg-white px-3 py-2 text-[11px] font-black inline-flex items-center justify-center gap-1"
                                >
                                    <Send size={14}/> Telegram
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openPopup(links.facebook)}
                                    className="rounded-2xl border border-stone-200 bg-white/85 hover:bg-white px-3 py-2 text-[11px] font-black inline-flex items-center justify-center gap-1"
                                >
                                    <Facebook size={14}/> Facebook
                                </button>

                                <button
                                    type="button"
                                    onClick={() => openPopup(links.linkedin)}
                                    className="rounded-2xl border border-stone-200 bg-white/85 hover:bg-white px-3 py-2 text-[11px] font-black inline-flex items-center justify-center gap-1"
                                >
                                    <Linkedin size={14}/> LinkedIn
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openPopup(links.x)}
                                    className="rounded-2xl border border-stone-200 bg-white/85 hover:bg-white px-3 py-2 text-[11px] font-black"
                                >
                                    X
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openPopup(links.email)}
                                    className="rounded-2xl border border-stone-200 bg-white/85 hover:bg-white px-3 py-2 text-[11px] font-black inline-flex items-center justify-center gap-1"
                                >
                                    <Mail size={14}/> Email
                                </button>
                            </div>

                            <div className="mt-2 text-[11px] text-stone-500">
                                {t("share.actions.desktop_hint")}
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
