"use client";

import type { TimelineItem } from "@/types/studio";
import React from "react";
import { Film } from "lucide-react";
import type { YearPalette, YearTick } from "./TimelineCanvas";
import { TimelineCanvasItem } from "@/components/studio/TimelineCanvasItem";

export function TimelineCanvasView(props: {
    timeline: TimelineItem[];
    palettes: YearPalette[];

    selectedItemId: string | null;
    onSelectItem: (id: string | null) => void;

    onDragStartTimeline: (e: React.DragEvent, item: TimelineItem) => void;
    onDeleteItem: (uniqueId: string) => void;
    onMoveItem: (uniqueId: string, direction: -1 | 1) => void;

    onRenameItem?: (uniqueId: string, title: string) => void;
    onDuplicateItem?: (uniqueId: string) => void;
    onReplaceItem?: (uniqueId: string) => void;
    onOpenAsset?: (assetId: string) => void;

    axisGradient: string;
    axisStart: number | null;
    axisEnd: number | null;

    yearTicks: YearTick[];

    previewIndex: number | null;
    previewX: number | null;
    previewGradient: string;

    showEmpty: boolean;
}) {
    const hasAxis = props.axisStart !== null && props.axisEnd !== null && props.axisEnd > props.axisStart;

    return (
        <>
            {/* Axis */}
            {props.timeline.length > 0 && hasAxis ? (
                <>
                    <div
                        className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full -z-10"
                        style={{
                            left: `${props.axisStart}px`,
                            width: `${props.axisEnd! - props.axisStart!}px`,
                            backgroundImage: props.axisGradient,
                        }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 h-10 -z-20 opacity-60 blur-2xl rounded-full"
                        style={{
                            left: `${props.axisStart}px`,
                            width: `${props.axisEnd! - props.axisStart!}px`,
                            backgroundImage: props.axisGradient,
                        }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 h-[1px] -z-10 opacity-25"
                        style={{
                            left: `${props.axisStart}px`,
                            width: `${props.axisEnd! - props.axisStart!}px`,
                            backgroundImage:
                                "repeating-linear-gradient(to right, rgba(15,23,42,0.25) 0px, rgba(15,23,42,0.25) 8px, transparent 8px, transparent 20px)",
                        }}
                        aria-hidden="true"
                    />
                </>
            ) : props.timeline.length === 0 ? (
                <div className="absolute left-20 right-20 top-1/2 -translate-y-1/2 h-[2px] -z-10 rounded-full bg-slate-200" />
            ) : null}

            {/* Year group labels */}
            {props.yearTicks.map((t) => (
                <div
                    key={`${t.year}-${t.x}`}
                    className="absolute top-1/2 -translate-y-[38px] z-10"
                    style={{ left: `${t.x}px` }}
                >
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur border border-slate-200 px-2.5 py-1 shadow-sm">
                        <span className="text-[11px] font-semibold text-slate-700">{t.year}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400/60" />
                    </div>
                </div>
            ))}

            {/* Drop preview */}
            {props.previewIndex !== null && props.previewX !== null && (
                <div
                    className="absolute z-20 pointer-events-none"
                    style={{
                        left: `${props.previewX}px`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "150px",
                        height: "240px",
                    }}
                >
                    <div className="relative h-full">
                        <div
                            className="absolute left-1/2 -translate-x-1/2 w-[4px] h-full rounded-full shadow-[0_0_0_6px_rgba(15,23,42,0.06)]"
                            style={{ backgroundImage: props.previewGradient }}
                        />
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 text-white text-[10px] px-3 py-1 shadow-lg">
                            Déposer ici
                        </div>
                    </div>
                </div>
            )}

            {/* Items */}
            {props.timeline.map((item, index) => {
                const pal = props.palettes[index];
                const isSelected = props.selectedItemId === item.uniqueId;

                return (
                    <TimelineCanvasItem
                        key={item.uniqueId}
                        item={item}
                        index={index}
                        palette={pal}
                        isSelected={isSelected}
                        isFirst={index === 0}
                        isLast={index === props.timeline.length - 1}
                        onSelect={props.onSelectItem}
                        onDragStart={props.onDragStartTimeline}
                        onDelete={props.onDeleteItem}
                        onMove={props.onMoveItem}
                        onRenameItem={props.onRenameItem}
                        onDuplicateItem={props.onDuplicateItem}
                        onReplaceItem={props.onReplaceItem}
                        onOpenAsset={props.onOpenAsset}
                    />
                );
            })}

            {/* Empty state */}
            {props.showEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-10 text-center">
                    <div className="bg-white/85 backdrop-blur p-7 rounded-3xl border border-slate-200 shadow-[0_22px_60px_-40px_rgba(2,6,23,0.35)]">
                        <Film className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
                        <p className="text-slate-700 text-sm font-semibold">Timeline vide</p>
                        <p className="text-xs text-slate-500 mt-1">Glissez des médias ici, ou touchez un élément de la bibliothèque.</p>
                        <p className="text-[11px] text-slate-400 mt-3">Mobile : 1 doigt = déplacer • Wheel = glisser • Ctrl/Cmd+wheel = zoom</p>
                    </div>
                </div>
            )}
        </>
    );
}
