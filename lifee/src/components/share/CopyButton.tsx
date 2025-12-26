// components/share/CopyButton.tsx
import React, {useMemo, useState} from "react";
import {Check, Link as LinkIcon} from "lucide-react";

type CopyButtonProps = Readonly<{
    value: string;
    label?: string;
    copiedLabel?: string;
    variant?: "dark" | "light";
    size?: "sm" | "md";
    className?: string;
}>;

async function copyToClipboard(text: string) {
    // Modern API
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
}

export function CopyButton({
                               value,
                               label = "Copier",
                               copiedLabel = "Copié",
                               variant = "light",
                               size = "md",
                               className = "",
                           }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const ui = useMemo(() => {
        const base =
            "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

        const sizing =
            size === "sm" ? "px-3 py-2 text-[11px]" : "px-3.5 py-2.5 text-xs";

        const themed =
            variant === "light"
                ? "border border-stone-200 bg-white/80 text-stone-800 shadow-sm backdrop-blur hover:bg-white focus-visible:ring-stone-400 ring-offset-stone-50"
                : "border border-white/10 bg-white/10 text-white hover:bg-white/15 focus-visible:ring-white/40 ring-offset-slate-950";

        return `${base} ${sizing} ${themed}`;
    }, [size, variant]);

    return (
        <button
            type="button"
            onClick={async () => {
                if (!value) return;
                try {
                    await copyToClipboard(value);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1200);
                } catch {
                    // ignore
                }
            }}
            className={`${ui} ${className}`}
            aria-label="Copier le lien"
            aria-live="polite"
        >
            {copied ? (
                <Check size={14} className={variant === "light" ? "text-rose-500" : "text-emerald-300"}/>
            ) : (
                <LinkIcon size={14} className={variant === "light" ? "text-stone-500" : "text-white/80"}/>
            )}
            <span className="font-semibold">
        {copied ? copiedLabel : label}
      </span>
        </button>
    );
}
