import React, { useMemo, useState } from "react";
import type { Asset } from "@/types/studio";
import { LibraryItemCard } from "./LibraryItemCard";
import { ChevronDown, Image as ImageIcon, Video } from "lucide-react";

function parseMonthYear(date?: string) {
    // attendu: "MM/YYYY"
    if (!date || !date.includes("/")) return { year: 0, month: 0 };
    const [mm, yyyy] = date.split("/");
    const month = Number(mm) || 0;
    const year = Number(yyyy) || 0;
    return { year, month };
}

function getYearKey(date?: string) {
    const { year } = parseMonthYear(date);
    return year > 0 ? String(year) : "Sans date";
}

function sortAssetsDesc(a: Asset, b: Asset) {
    const pa = parseMonthYear(a.date);
    const pb = parseMonthYear(b.date);
    if (pa.year !== pb.year) return pb.year - pa.year;
    if (pa.month !== pb.month) return pb.month - pa.month;
    return String(a.title || "").localeCompare(String(b.title || ""));
}

function sortYearKeysDesc(a: string, b: string) {
    if (a === "Sans date") return 1;
    if (b === "Sans date") return -1;
    return Number(b) - Number(a);
}

export function LibraryList(props: Readonly<{
    items: Asset[];
    onAdd: (asset: Asset) => void;
    onDragStart: (e: React.DragEvent, asset: Asset) => void;
    onRequestDelete: (asset: Asset) => void;
}>) {
    const groups = useMemo(() => {
        const map = new Map<string, { yearKey: string; photos: Asset[]; videos: Asset[] }>();


        for (const item of props.items) {
            console.log('itemS', item)
            const yearKey = getYearKey(item.date);
            if (!map.has(yearKey)) map.set(yearKey, { yearKey, photos: [], videos: [] });

            const g = map.get(yearKey)!;
            if (item.type === "video") g.videos.push(item);
            else g.photos.push(item);
        }

        const arr = Array.from(map.values());
        arr.sort((a, b) => sortYearKeysDesc(a.yearKey, b.yearKey));
        for (const g of arr) {
            g.photos.sort(sortAssetsDesc);
            g.videos.sort(sortAssetsDesc);
        }
        return arr;
    }, [props.items]);

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    if (props.items.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-6 text-center shadow-sm">
                    <p className="text-sm font-semibold text-slate-700">Aucun média</p>
                    <p className="mt-1 text-xs text-slate-500">Importez une photo/vidéo ou changez votre recherche.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-3 py-4 bg-gray-50/50">
            <div className="space-y-4">
                {groups.map((g) => {
                    const isClosed = !!collapsed[g.yearKey];
                    const total = g.photos.length + g.videos.length;

                    return (
                        <div key={g.yearKey} className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
                            {/* Year header */}
                            <button
                                type="button"
                                onClick={() => setCollapsed((s) => ({ ...s, [g.yearKey]: !s[g.yearKey] }))}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white transition-colors"
                                aria-expanded={!isClosed}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-slate-800">{g.yearKey}</div>
                                        <div className="text-[11px] text-slate-500">{total} élément{total > 1 ? "s" : ""}</div>
                                    </div>
                                </div>

                                <ChevronDown
                                    size={18}
                                    className={[
                                        "text-slate-400 transition-transform",
                                        isClosed ? "-rotate-90" : "rotate-0",
                                    ].join(" ")}
                                />
                            </button>

                            {/* Content */}
                            {!isClosed && (
                                <div className="px-3 pb-3">
                                    {/* VIDEOS */}
                                    {g.videos.length > 0 && (
                                        <div className="mt-2">
                                            <div className="px-2 py-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                                                    <Video size={14} className="text-indigo-500" />
                                                    Vidéos
                                                </div>
                                                <div className="text-[11px] text-slate-400">{g.videos.length}</div>
                                            </div>
                                            <div className="space-y-2">
                                                {g.videos.map((item) => (
                                                    <LibraryItemCard
                                                        key={item.id}
                                                        item={item}
                                                        onAdd={props.onAdd}
                                                        onDragStart={props.onDragStart}
                                                        onRequestDelete={props.onRequestDelete}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Divider only if both */}
                                    {g.videos.length > 0 && g.photos.length > 0 && (
                                        <div className="my-3 h-px bg-slate-200/70" />
                                    )}

                                    {/* PHOTOS */}
                                    {g.photos.length > 0 && (
                                        <div>
                                            <div className="px-2 py-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                                                    <ImageIcon size={14} className="text-rose-500" />
                                                    Photos <span className="text-[11px] font-medium text-slate-400 normal-case">(générables)</span>
                                                </div>
                                                <div className="text-[11px] text-slate-400">{g.photos.length}</div>
                                            </div>
                                            <div className="space-y-2">
                                                {g.photos.map((item) => (
                                                    <LibraryItemCard
                                                        key={item.id}
                                                        item={item}
                                                        onAdd={props.onAdd} // bouton Générer (dans card) déclenche ce flow
                                                        onDragStart={props.onDragStart}
                                                        onRequestDelete={props.onRequestDelete}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
