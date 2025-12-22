import React, { useMemo } from "react";
import {
    GripHorizontal,
    Image as ImageIcon,
    Plus,
    Trash2,
    Video,
    Play,
    Wand2,
} from "lucide-react";
import type { Asset } from "@/types/studio";

function formatMeta(item: Asset) {
    const parts: string[] = [];
    if (item.date) parts.push(item.date);
    if (item.type === "video" && item.duration) parts.push(item.duration);
    return parts.join(" • ");
}

export function LibraryItemCard(props: Readonly<{
    item: Asset;
    onAdd: (asset: Asset) => void;
    onDragStart: (e: React.DragEvent, asset: Asset) => void;
    onRequestDelete: (asset: Asset) => void;
}>) {
    const { item } = props;

    const meta = useMemo(() => formatMeta(item), [item]);
    const isVideo = item.type === "video";
    const isPhoto = item.type === "image";

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            props.onAdd(item);
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={isPhoto ? `Générer une vidéo depuis ${item.title}` : `Ajouter ${item.title} à la timeline`}
            onKeyDown={onKeyDown}
            onClick={() => props.onAdd(item)}
            className={[
                "group relative w-full rounded-2xl border border-slate-200 bg-white/90 backdrop-blur",
                "shadow-[0_14px_45px_-35px_rgba(2,6,23,0.35)]",
                "transition-all duration-200",
                "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_60px_-40px_rgba(2,6,23,0.45)]",
                "active:translate-y-0 active:scale-[0.99]",
                "focus:outline-none focus:ring-2 focus:ring-rose-200",
                "cursor-pointer",
            ].join(" ")}
        >
            {/* Glow subtil */}
            <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{
                    background:
                        "radial-gradient(1200px 220px at 10% 0%, rgba(244,63,94,0.12), transparent 55%), radial-gradient(900px 220px at 90% 100%, rgba(245,158,11,0.10), transparent 55%)",
                }}
                aria-hidden="true"
            />

            <div className="relative flex items-center gap-3 p-3">
                {/* THUMB */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                            draggable={false}
                        />
                    ) : (
                        <div className="h-full w-full grid place-items-center text-slate-400">
                            {isVideo ? <Video size={18} /> : <ImageIcon size={18} />}
                        </div>
                    )}


                    {/* Overlay play si vidéo */}
                    {isVideo && (
                        <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <div className="rounded-full border border-white/40 bg-black/35 p-1.5 text-white backdrop-blur">
                                <Play size={14} className="fill-white" />
                            </div>
                        </div>
                    )}
                </div>

                {/* TEXT */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="truncate text-sm font-semibold text-slate-800">{item.title}</h4>

                        {/* ACTIONS */}
                        {isPhoto && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    props.onAdd(item); // ton flow IA (modal prompt/durée) se déclenche ici
                                }}
                                className={[
                                    "absolute right-13 md:scale-75 md:right-0 md:top-2 md:bottom-auto bottom-5 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold",
                                    "border border-rose-200 bg-rose-50 text-rose-700",
                                    "hover:bg-rose-100 hover:border-rose-300 transition-colors",
                                    "shadow-sm",
                                    "focus:outline-none focus:ring-2 focus:ring-rose-200",
                                ].join(" ")}
                                aria-label={`Générer une vidéo depuis ${item.title}`}
                                title="Générer une vidéo"
                            >
                                <Wand2 size={14} />
                                Générer
                            </button>
                        )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
                className={[
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    isVideo
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-rose-200 bg-rose-50 text-rose-700",
                ].join(" ")}
            >
              {isVideo ? <Video size={14} /> : <ImageIcon size={14} />}
                {isVideo ? "Vidéo" : "Photo"}
            </span>

                        {meta ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {meta}
              </span>
                        ) : null}
                    </div>

                    {/* Hint desktop */}
                    <div className="mt-1 hidden md:block text-[11px] text-slate-400">
                        {isPhoto ? "Cliquez ou générez → vidéo • Glissez via la poignée" : "Cliquez pour ajouter • Glissez via la poignée"}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* ✅ Bouton Générer pour les photos */}

                    {/* Delete */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onRequestDelete(item);
                        }}
                        className={[
                            "opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity",
                            "p-2 rounded-xl border border-transparent",
                            "hover:border-slate-200 hover:bg-white",
                            "text-slate-400 hover:text-rose-600",
                            "focus:outline-none focus:ring-2 focus:ring-rose-200",
                        ].join(" ")}
                        title="Supprimer"
                        aria-label={`Supprimer ${item.title}`}
                    >
                        <Trash2 size={16} />
                    </button>

                    {/* Drag handle (desktop) */}
                    <div className="hidden md:flex items-center">
                        <div
                            draggable
                            onDragStart={(e) => {
                                e.stopPropagation();
                                props.onDragStart(e, item);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={[
                                "p-2 rounded-xl border border-transparent",
                                "text-slate-300 group-hover:text-slate-600",
                                "hover:bg-white hover:border-slate-200",
                                "cursor-grab active:cursor-grabbing",
                                "transition-colors",
                            ].join(" ")}
                            title="Glisser"
                            aria-label={`Glisser ${item.title}`}
                            role="button"
                            tabIndex={-1}
                        >
                            <GripHorizontal size={16} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
