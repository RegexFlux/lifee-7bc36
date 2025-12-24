"use client";

import React, { useEffect } from "react";
import { Film, PanelLeftClose, Plus, Search, Image as ImageIcon, Video } from "lucide-react";
import type { Asset } from "@/types/studio";
import { LibraryList } from "./LibraryList";

export function Sidebar(props: Readonly<{
    open: boolean;
    searchTerm: string;
    filterType: "all" | "video" | "image";
    filteredItems: Asset[];

    // ✅ optionnels : stats globales (pour header)
    stats?: { total: number; videos: number; images: number };

    onChangeSearch: (v: string) => void;
    onChangeFilter: (v: "all" | "video" | "image") => void;

    onOpenUpload: () => void;
    onClose: () => void;

    onAdd: (asset: Asset) => void;
    onDragStart: (e: React.DragEvent, asset: Asset) => void;
    onRequestDelete: (asset: Asset) => void;

    // ✅ optionnel : pour fermer automatiquement sur mobile après add
    onAutoCloseAfterAdd?: () => void;
}>) {
    // ✅ ESC close (petit confort desktop)
    useEffect(() => {
        if (!props.open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") props.onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [props.open, props.onClose]);

    const stats = props.stats ?? { total: props.filteredItems.length, videos: props.filteredItems.filter(i => i.type === 'video').length, images: props.filteredItems.filter(i => i.type === 'image').length };

    return (
        <div
            className={`fixed md:relative z-40 h-full flex flex-col border-r border-stone-200 bg-white transition-all duration-300 ease-in-out shadow-2xl md:shadow-xl ${
                props.open
                    ? "translate-x-0 w-full md:w-[360px]"
                    : "-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden"
            }`}
        >
            {/* Header premium */}
            <div className="shrink-0 border-b border-stone-200">
                <div className="relative px-4 md:px-5 pt-4 pb-4 bg-gradient-to-b from-stone-50 to-white">
                    {/* Glow */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-12 -right-10 h-40 w-40 rounded-full bg-rose-200/25 blur-3xl" />
                        <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-amber-200/25 blur-3xl" />
                    </div>

                    <div className="relative flex items-start justify-between gap-3" >
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-[11px] font-bold text-stone-700 shadow-sm backdrop-blur">
                                <Film className="h-4 w-4 text-rose-600" />
                                Lifee Studio
                            </div>

                            <div className="mt-3 flex items-end justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="text-lg font-serif text-stone-900 leading-none">Bibliothèque</h2>
                                    <p className="mt-1 text-xs text-stone-500">
                                        Glissez-déposez sur la timeline • ou cliquez pour ajouter
                                    </p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="mt-3 flex items-center gap-2 text-[11px] text-stone-600">
                                <div className="flex gap-2 items-center rounded-full border border-stone-200 bg-white px-2 py-1 w-max">
                                    <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                <span className="w-max">

                    {stats.total} total
                </span>
                                </div>
                                <div className="flex gap-2 items-center rounded-full border border-stone-200 bg-white px-2 py-1">
                                <Video className="h-3.5 w-3.5 text-indigo-600" />

                                <span className="inline-flex items-center gap-1  w-max">
                                    {stats.videos} vidéos
                </span>
                                </div>
                                <div className="flex gap-2 items-center rounded-full border border-stone-200 bg-white px-2 py-1 w-max">
                                    <ImageIcon className="h-3.5 w-3.5 text-rose-600" />
                                <span className="w-max">

                                    {stats.images} photos
                </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                data-tour="import"
                                onClick={props.onOpenUpload}
                                className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-3 py-2 text-white shadow-lg hover:bg-stone-800 transition-colors"
                                title="Importer"
                            >
                                <Plus size={16} />
                                <span className="text-sm font-bold">Importer</span>
                            </button>

                            <button
                                onClick={props.onClose}
                                className="p-2 rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
                                title="Fermer"
                            >
                                <PanelLeftClose size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mt-4" data-tour="search">
                        <Search className="absolute left-3 top-1/5 h-4 w-4 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un souvenir…"
                            value={props.searchTerm}
                            onChange={(e) => props.onChangeSearch(e.target.value)}
                            className="w-full rounded-2xl border border-stone-200 bg-white pl-9 pr-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                        />
                        <div className="mt-1 text-[10px] text-stone-400 flex justify-between">
                            <span>Astuce : “1984”, “mariage”, “été”…</span>
                            <span className="hidden md:inline">ESC pour fermer</span>
                        </div>
                    </div>

                    {/* Filters (pills) */}
                    <div className="mt-4 flex gap-2" data-tour="filters">
                        <button
                            onClick={() => props.onChangeFilter("all")}
                            className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-bold transition-all ${
                                props.filterType === "all"
                                    ? "border-stone-900 bg-stone-900 text-white shadow"
                                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                            }`}
                        >
                            Tous
                        </button>

                        <button
                            onClick={() => props.onChangeFilter("video")}
                            className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                props.filterType === "video"
                                    ? "border-indigo-600 bg-indigo-600 text-white shadow"
                                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                            }`}
                        >
                            <Video size={14} />
                            Vidéos
                        </button>

                        <button
                            onClick={() => props.onChangeFilter("image")}
                            className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                props.filterType === "image"
                                    ? "border-rose-600 bg-rose-600 text-white shadow"
                                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                            }`}
                        >
                            <ImageIcon size={14} />
                            Photos
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <LibraryList
                items={props.filteredItems}
                onAdd={(asset) => {
                    props.onAdd(asset);
                    props.onAutoCloseAfterAdd?.();
                }}
                onDragStart={props.onDragStart}
                onRequestDelete={props.onRequestDelete}
            />
        </div>
    );
}
