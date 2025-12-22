"use client";

import type { TimelineItem } from "@/types/studio";
import React from "react";
import {
    ArrowLeft,
    ArrowRight,
    Image as ImageIcon,
    Trash2,
    Video,
    Wand2,
} from "lucide-react";
import type { YearPalette } from "./TimelineCanvas";

function getYearFromDate(d?: string) {
    return d?.split("/")[1] || d || "";
}

export function TimelineCanvasItem(props: {
    item: TimelineItem;
    index: number;
    palette: YearPalette;
    isSelected: boolean;
    isFirst: boolean;
    isLast: boolean;

    onSelect: (id: string | null) => void;
    onDragStart: (e: React.DragEvent, item: TimelineItem) => void;

    onDelete: (uniqueId: string) => void;
    onMove: (uniqueId: string, direction: -1 | 1) => void;

    onRenameItem?: (uniqueId: string, title: string) => void;
    onDuplicateItem?: (uniqueId: string) => void;
    onReplaceItem?: (uniqueId: string) => void;
    onOpenAsset?: (assetId: string) => void;
}) {
    const { item, palette: pal } = props;

    const isEven = props.index % 2 === 0;
    const yearStr = getYearFromDate(item.date) || pal.year;

    return (
        <div
            data-timeline-item="1"
            data-id={item.uniqueId}
            onClick={(e) => {
                e.stopPropagation();
                props.onSelect(props.isSelected ? null : item.uniqueId);
            }}
            draggable
            onDragStart={(e) => props.onDragStart(e, item)}
            className={
                "timeline-item interactive-area relative mx-5 md:mx-8 flex justify-center transition-all duration-300 " +
                (props.isSelected ? "z-20 scale-[1.06]" : "z-10")
            }
            style={{ minWidth: "180px" }}
        >
            {/* Connector */}
            <div
                className="absolute left-1/2 w-[2px] -translate-x-1/2 z-0 opacity-55"
                style={{
                    height: "96px",
                    top: isEven ? "50%" : "auto",
                    bottom: isEven ? "auto" : "50%",
                    backgroundImage: `linear-gradient(180deg, transparent, ${pal.a}, transparent)`,
                }}
                aria-hidden="true"
            />

            {/* Node */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center">
                <div
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white mb-1 shadow-sm border border-white/80"
                    style={{ backgroundImage: pal.chipGradient }}
                >
                    {yearStr}
                </div>
                <div
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-md"
                    style={{ backgroundColor: pal.dot, boxShadow: `0 0 0 6px ${pal.ring}` }}
                />
            </div>

            {/* Card */}
            <div
                className="relative w-48 rounded-2xl border bg-white/92 backdrop-blur shadow-[0_18px_50px_-30px_rgba(2,6,23,0.35)] p-3.5 flex flex-col text-left transition-all hover:-translate-y-0.5"
                style={{
                    transform: isEven ? "translateY(120px)" : "translateY(-120px)",
                    borderColor: pal.border,
                    boxShadow: props.isSelected
                        ? `0 0 0 4px ${pal.ring}, 0 18px 50px -30px rgba(2,6,23,0.35)`
                        : "0 18px 50px -30px rgba(2,6,23,0.35)",
                }}
            >
                {/* Top row: icon + year small + actions (on select) */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center border"
                            style={{ backgroundColor: pal.iconBg, borderColor: pal.border, color: pal.text }}
                            aria-hidden="true"
                        >
                            {item.isGenerated ? (
                                <Wand2 size={18} />
                            ) : item.type === "video" ? (
                                <Video size={18} />
                            ) : (
                                <ImageIcon size={18} />
                            )}
                        </div>

                        <div className="flex flex-col">
                            <div className="text-[11px] font-semibold" style={{ color: pal.text }}>
                                {item.title}
                            </div>
                            <div className="text-[10px] text-slate-400">
                                {yearStr} • {item.type === "video" ? "Vidéo" : "Photo"}
                            </div>
                        </div>
                    </div>

                    {props.isSelected && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                props.onDelete(item.uniqueId);
                                props.onSelect(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-full shadow-lg"
                            aria-label="Supprimer de la timeline"
                            title="Supprimer"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>

                {/* Prompt / context */}
                <div className="mt-3">
                    {item.isGenerated ? (
                        <div
                            className="text-[11px] px-2.5 py-2 rounded-xl border leading-snug"
                            style={{ backgroundColor: pal.lightBg, borderColor: pal.border, color: pal.text }}
                            title={item.context || ""}
                        >
                            <span className="font-semibold">Prompt :</span>{" "}
                            <span className="opacity-90">{item.context || "—"}</span>
                        </div>
                    ) : (
                        <div className="text-[11px] px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                            <span className="font-semibold">Source :</span> Original
                        </div>
                    )}
                </div>

                {/* Move controls */}
                {props.isSelected && (
                    <div className="mt-3 flex items-center justify-between">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                props.onMove(item.uniqueId, -1);
                            }}
                            disabled={props.isFirst}
                            className={
                                "p-2 rounded-full shadow-md text-white transition-all " +
                                (props.isFirst ? "bg-slate-300 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800")
                            }
                            aria-label="Déplacer à gauche"
                            title="Déplacer à gauche"
                        >
                            <ArrowLeft size={14} />
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                props.onMove(item.uniqueId, 1);
                            }}
                            disabled={props.isLast}
                            className={
                                "p-2 rounded-full shadow-md text-white transition-all " +
                                (props.isLast ? "bg-slate-300 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800")
                            }
                            aria-label="Déplacer à droite"
                            title="Déplacer à droite"
                        >
                            <ArrowRight size={14} />
                        </button>
                    </div>
                )}

                {/* caret */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white/92 border transform rotate-45"
                    style={{
                        borderColor: pal.border,
                        top: isEven ? "-8px" : "auto",
                        bottom: isEven ? "auto" : "-8px",
                        borderTop: isEven ? undefined : "0",
                        borderLeft: isEven ? undefined : "0",
                        borderBottom: isEven ? "0" : undefined,
                        borderRight: isEven ? "0" : undefined,
                    }}
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}
