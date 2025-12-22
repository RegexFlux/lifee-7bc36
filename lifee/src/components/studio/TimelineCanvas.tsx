"use client";

import React, { useMemo, useRef, useState } from "react";
import {
    ArrowLeft,
    ArrowRight,
    Film,
    Image as ImageIcon,
    Trash2,
    Video,
    Wand2,
} from "lucide-react";
import type { TimelineItem } from "@/types/studio";

type DragPayload = { item: any; source: "library" | "timeline" };

const DEFAULT_ITEM_SLOT_WIDTH = 200;
const DEFAULT_PADDING_LEFT = 160;

function getYearFromDate(d?: string) {
    return d?.split("/")[1] || d || "";
}

function getColorByYear(year: string) {
    const y = parseInt(year, 10);
    if (y === 2023)
        return {
            border: "border-purple-500",
            text: "text-purple-600",
            bg: "bg-purple-500",
            lightBg: "bg-purple-50",
        };
    if (y === 2024)
        return {
            border: "border-cyan-500",
            text: "text-cyan-600",
            bg: "bg-cyan-500",
            lightBg: "bg-cyan-50",
        };
    if (y === 2025)
        return {
            border: "border-green-500",
            text: "text-green-600",
            bg: "bg-green-500",
            lightBg: "bg-green-50",
        };
    return {
        border: "border-indigo-500",
        text: "text-indigo-600",
        bg: "bg-indigo-500",
        lightBg: "bg-indigo-50",
    };
}

export function TimelineCanvas(props: {
    timeline: TimelineItem[];

    selectedItemId: string | null;
    onSelectItem: (id: string | null) => void;

    transform: { x: number; y: number; scale: number };
    onTransformChange: (t: { x: number; y: number; scale: number }) => void;

    itemSlotWidth?: number;
    paddingLeft?: number;

    onDragStartTimeline: (e: React.DragEvent, item: TimelineItem) => void;
    onDropPlacement: (payload: DragPayload, index: number) => void;

    onDeleteItem: (uniqueId: string) => void;
    onMoveItem: (uniqueId: string, direction: -1 | 1) => void;
}) {
    const ITEM_SLOT_WIDTH = props.itemSlotWidth ?? DEFAULT_ITEM_SLOT_WIDTH;
    const PADDING_LEFT = props.paddingLeft ?? DEFAULT_PADDING_LEFT;

    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    // Panning
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    const backgroundStyle = useMemo(() => {
        const { x, y, scale } = props.transform;
        return {
            backgroundSize: `${40 * scale}px ${40 * scale}px`,
            backgroundPosition: `${x}px ${y}px`,
            backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
        } as React.CSSProperties;
    }, [props.transform]);

    const handleStartPan = (clientX: number, clientY: number) => {
        setIsPanning(true);
        setLastMousePos({ x: clientX, y: clientY });
    };

    const handleMovePan = (clientX: number, clientY: number) => {
        if (!isPanning) return;
        const dx = clientX - lastMousePos.x;
        const dy = clientY - lastMousePos.y;
        props.onTransformChange({
            ...props.transform,
            x: props.transform.x + dx,
            y: props.transform.y + dy,
        });
        setLastMousePos({ x: clientX, y: clientY });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
            target.closest("button") ||
            target.closest(".interactive-area") ||
            target.closest(".no-pan")
        )
            return;
        handleStartPan(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: React.MouseEvent) => handleMovePan(e.clientX, e.clientY);
    const handleMouseUp = () => setIsPanning(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        if (
            target.closest("button") ||
            target.closest(".interactive-area") ||
            target.closest(".no-pan")
        )
            return;
        const t = e.touches[0];
        handleStartPan(t.clientX, t.clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const t = e.touches[0];
        handleMovePan(t.clientX, t.clientY);
    };

    const handleTouchEnd = () => setIsPanning(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDraggingOver(true);

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const { x, scale } = props.transform;

        const xInsideCanvas = (e.clientX - rect.left - x) / scale;
        const relativeX = xInsideCanvas - PADDING_LEFT;

        let idx = Math.round(relativeX / ITEM_SLOT_WIDTH);
        idx = Math.max(0, Math.min(idx, props.timeline.length));
        setPreviewIndex(idx);
    };

    const handleDragLeave = () => {
        setIsDraggingOver(false);
        setPreviewIndex(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);

        const idx = previewIndex ?? props.timeline.length;
        setPreviewIndex(null);

        try {
            const data = JSON.parse(
                e.dataTransfer.getData("application/json")
            ) as DragPayload;
            props.onDropPlacement(data, idx);
        } catch {
            // ignore
        }
    };

    return (
        <div
            className="flex-1 overflow-hidden relative touch-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
        >
            <div
                className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                style={backgroundStyle}
            />

            <div
                ref={containerRef}
                className="absolute origin-top-left flex items-center h-full min-w-max transition-transform duration-75 ease-out"
                style={{
                    transform: `translate(${props.transform.x}px, ${props.transform.y}px) scale(${props.transform.scale})`,
                    paddingLeft: `${PADDING_LEFT}px`,
                    paddingRight: `${PADDING_LEFT}px`,
                }}
            >
                {/* Timeline line */}
                {props.timeline.length > 0 ? (
                    <div className="absolute left-0 right-0 top-1/2 h-1.5 -z-10 rounded-full bg-gray-300" />
                ) : (
                    <div className="absolute left-20 right-20 top-1/2 h-1 bg-gray-200 -z-10 rounded-full" />
                )}

                {/* Preview ghost */}
                {previewIndex !== null && (
                    <div
                        className="absolute z-0 flex items-center justify-center pointer-events-none opacity-50"
                        style={{
                            left: `${previewIndex * ITEM_SLOT_WIDTH}px`,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "140px",
                            height: "200px",
                        }}
                    >
                        <div className="w-1 h-full border-l-2 border-dashed border-indigo-500" />
                        <div className="absolute top-0 bg-indigo-500 text-white text-[10px] px-2 rounded-full transform -translate-y-1/2">
                            Insérer
                        </div>
                    </div>
                )}

                {/* Items */}
                {props.timeline.map((item, index) => {
                    const yearStr = getYearFromDate(item.date);
                    const styles = getColorByYear(yearStr);
                    const isEven = index % 2 === 0;
                    const isSelected = props.selectedItemId === item.uniqueId;
                    const isFirst = index === 0;
                    const isLast = index === props.timeline.length - 1;

                    return (
                        <div
                            key={item.uniqueId}
                            onClick={(e) => {
                                e.stopPropagation();
                                props.onSelectItem(isSelected ? null : item.uniqueId);
                            }}
                            draggable
                            onDragStart={(e) => props.onDragStartTimeline(e, item)}
                            className={`timeline-item interactive-area relative mx-3 md:mx-6 flex justify-center transition-all duration-300 ${
                                isSelected ? "z-20 scale-105" : "z-10"
                            }`}
                            style={{ minWidth: "140px" }}
                        >
                            <div
                                className={`absolute left-1/2 w-0.5 -translate-x-1/2 z-0 transition-all duration-300 ${styles.bg} opacity-30`}
                                style={{
                                    height: "80px",
                                    top: isEven ? "50%" : "auto",
                                    bottom: isEven ? "auto" : "50%",
                                }}
                            />

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center">
                                <div
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white mb-1 shadow-sm ${styles.bg} border border-white`}
                                >
                                    {yearStr}
                                </div>
                                <div className={`w-3 h-3 rounded-full border border-white shadow-md ${styles.bg}`} />
                            </div>

                            <div
                                className={`relative w-40 bg-white rounded-xl shadow-md border ${
                                    isSelected ? "border-indigo-500 ring-2 ring-indigo-200" : styles.border
                                } p-3 flex flex-col items-center text-center transition-all`}
                                style={{ transform: isEven ? "translateY(100px)" : "translateY(-100px)" }}
                            >
                                {isSelected && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                props.onDeleteItem(item.uniqueId);
                                                props.onSelectItem(null);
                                            }}
                                            className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg animate-in zoom-in duration-200 z-30"
                                            aria-label="Supprimer de la timeline"
                                        >
                                            <Trash2 size={12} />
                                        </button>

                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-30 animate-in slide-in-from-top-2 duration-200">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    props.onMoveItem(item.uniqueId, -1);
                                                }}
                                                disabled={isFirst}
                                                className={`p-1.5 rounded-full shadow-md text-white transition-all ${
                                                    isFirst ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-600"
                                                }`}
                                                aria-label="Déplacer à gauche"
                                            >
                                                <ArrowLeft size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    props.onMoveItem(item.uniqueId, 1);
                                                }}
                                                disabled={isLast}
                                                className={`p-1.5 rounded-full shadow-md text-white transition-all ${
                                                    isLast ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-600"
                                                }`}
                                                aria-label="Déplacer à droite"
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}

                                <div className={`w-10 h-10 rounded-full mb-2 flex items-center justify-center ${styles.lightBg} ${styles.text}`}>
                                    {item.isGenerated ? (
                                        <Wand2 size={16} />
                                    ) : item.type === "video" ? (
                                        <Video size={16} />
                                    ) : (
                                        <ImageIcon size={16} />
                                    )}
                                </div>

                                <h3 className={`font-bold text-xs leading-tight mb-1 ${styles.text} truncate w-full`}>
                                    {item.title}
                                </h3>

                                {item.isGenerated ? (
                                    <div className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded w-full mt-1 text-left truncate">
                                        <Wand2 size={8} className="inline mr-1" />
                                        {item.context || "AI"}
                                    </div>
                                ) : (
                                    <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-wider">
                                        Original
                                    </p>
                                )}

                                <div
                                    className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t ${
                                        isSelected ? "border-indigo-500" : styles.border
                                    } transform rotate-45`}
                                    style={{
                                        top: isEven ? "-7px" : "auto",
                                        bottom: isEven ? "auto" : "-7px",
                                        borderTop: isEven ? undefined : "0",
                                        borderLeft: isEven ? undefined : "0",
                                        borderBottom: isEven ? "0" : undefined,
                                        borderRight: isEven ? "0" : undefined,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {props.timeline.length === 0 && !isDraggingOver && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-10 text-center">
                    <div className="bg-white/80 p-6 rounded-2xl border-2 border-dashed border-gray-300 backdrop-blur-sm">
                        <Film className="w-10 h-10 mx-auto mb-2 opacity-30 text-gray-400" />
                        <p className="text-gray-500 text-sm">Timeline vide</p>
                        <p className="text-xs text-gray-400 mt-1">Glissez des médias ou cliquez</p>
                    </div>
                </div>
            )}
        </div>
    );
}
