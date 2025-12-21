// components/lifee/CopyButton.tsx
import React, { useState } from "react";
import { Link as LinkIcon } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);

    return (
        <button
            type="button"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                } catch {
                    // ignore
                }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition text-xs"
            aria-label="Copier le lien"
        >
            <LinkIcon size={14} className="text-white/80" />
            <span className="text-white/90 font-semibold">{copied ? "Copié" : "Copier le lien"}</span>
        </button>
    );
}
