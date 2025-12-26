"use client";

import React, { useEffect } from "react";
import { Copy, ExternalLink, Pencil, RefreshCcw, Trash2 } from "lucide-react";

export function TimelineItemMenu(props: {
    open: boolean;
    paletteBorder: string;
    assetId?: string;
    onClose: () => void;

    onRename: () => void;
    onDuplicate: () => void;
    onReplace: () => void;
    onOpenAsset: () => void;
    onDelete: () => void;
}) {
    useEffect(() => {
        if (!props.open) return;

        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") props.onClose();
        }

        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [props.open, props]);

    if (!props.open) return null;

    return (
        <div
            className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white shadow-xl overflow-hidden z-50"
            style={{ borderColor: props.paletteBorder }}
            onClick={(e) => e.stopPropagation()}
            data-item-menu="1"
        >
            <button
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-stone-50 flex items-center gap-2"
                onClick={props.onRename}
            >
                <Pencil size={14} />
                Renommer
            </button>

            <button
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-stone-50 flex items-center gap-2"
                onClick={props.onDuplicate}
            >
                <Copy size={14} />
                Dupliquer
            </button>

            <button
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-stone-50 flex items-center gap-2"
                onClick={props.onReplace}
            >
                <RefreshCcw size={14} />
                Remplacer…
            </button>

            <button
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-stone-50 flex items-center gap-2 disabled:opacity-50"
                disabled={!props.assetId}
                onClick={props.onOpenAsset}
            >
                <ExternalLink size={14} />
                Ouvrir l’asset source
            </button>

            <div className="h-px bg-stone-100" />

            <button
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-rose-50 text-rose-700 flex items-center gap-2"
                onClick={props.onDelete}
            >
                <Trash2 size={14} />
                Supprimer
            </button>
        </div>
    );
}
