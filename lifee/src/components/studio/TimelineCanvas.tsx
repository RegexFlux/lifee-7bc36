"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowLeft,
    ArrowRight,
    Film,
    Image as ImageIcon,
    Trash2,
    Video,
    Wand2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
} from "lucide-react";
import type { TimelineItem } from "@/types/studio";

type DragPayload = { item: any; source: "library" | "timeline" };

const DEFAULT_ITEM_SLOT_WIDTH = 200;
const DEFAULT_PADDING_LEFT = 160;

const MIN_SCALE = 0.35;
const MAX_SCALE = 1.75;

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function getYearFromDate(d?: string) {
    return d?.split("/")[1] || d || "";
}

/**
 * "Random" mais déterministe (SSR-safe): la couleur est pseudo-aléatoire
 * et stable pour une année donnée.
 */
function hashToHue(input: string) {
    let h = 2166136261; // FNV-ish
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h) % 360;
}

function yearPalette(year: string) {
    const hue = hashToHue(year || "0");
    const hue2 = (hue + 26) % 360;

    const a = `hsl(${hue} 82% 55%)`;
    const b = `hsl(${hue2} 82% 55%)`;

    return {
        year,
        a,
        b,
        chipGradient: `linear-gradient(90deg, ${a}, ${b})`,
        dot: a,
        border: `hsla(${hue} 82% 55% / 0.30)`,
        ring: `hsla(${hue} 82% 55% / 0.22)`,
        lightBg: `hsla(${hue} 82% 55% / 0.10)`,
        iconBg: `hsla(${hue} 82% 55% / 0.14)`,
        text: `hsl(${hue} 45% 32%)`,
        connector: `linear-gradient(180deg, transparent, hsla(${hue} 82% 55% / 0.55), transparent)`,
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

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // éviter stale closures (inertie / wheel / pinch)
    const transformRef = useRef(props.transform);
    useEffect(() => {
        transformRef.current = props.transform;
    }, [props.transform]);

    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    // Panning / inertie
    const [isPanning, setIsPanning] = useState(false);
    const lastPosRef = useRef({ x: 0, y: 0, t: 0 });
    const velocityRef = useRef({ vx: 0, vy: 0 });
    const rafRef = useRef<number | null>(null);

    // Pinch
    const pinchRef = useRef<{
        active: boolean;
        startDist: number;
        startScale: number;
    } | null>(null);

    const palettes = useMemo(() => {
        return props.timeline.map((it) => yearPalette(getYearFromDate(it.date)));
    }, [props.timeline]);

    // ✅ Axe: gradient basé sur les couleurs des éléments (stops entre items)
    const axisGradient = useMemo(() => {
        const n = palettes.length;
        if (n === 0) return "linear-gradient(90deg, rgba(148,163,184,0.45), rgba(148,163,184,0.45))";
        if (n === 1) return `linear-gradient(90deg, ${palettes[0].a}, ${palettes[0].b})`;

        const stops: string[] = [];
        for (let i = 0; i < n; i++) {
            const p = (i / (n - 1)) * 100;
            // on ancre le "a" de chaque item, la transition se fait entre éléments
            stops.push(`${palettes[i].a} ${p}%`);
        }
        return `linear-gradient(90deg, ${stops.join(", ")})`;
    }, [palettes]);

    const stopInertia = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        velocityRef.current = { vx: 0, vy: 0 };
    };

    const zoomAt = (clientX: number, clientY: number, nextScale: number) => {
        const wr = wrapperRef.current?.getBoundingClientRect();
        const t = transformRef.current;

        if (!wr) {
            props.onTransformChange({ ...t, scale: nextScale });
            return;
        }

        const worldX = (clientX - wr.left - t.x) / t.scale;
        const worldY = (clientY - wr.top - t.y) / t.scale;

        const newX = clientX - wr.left - worldX * nextScale;
        const newY = clientY - wr.top - worldY * nextScale;

        props.onTransformChange({ x: newX, y: newY, scale: nextScale });
    };

    const nudgePan = (dx: number, dy: number) => {
        const t = transformRef.current;
        props.onTransformChange({ ...t, x: t.x + dx, y: t.y + dy });
    };

    const startPan = (clientX: number, clientY: number) => {
        stopInertia();
        setIsPanning(true);
        lastPosRef.current = { x: clientX, y: clientY, t: performance.now() };
        velocityRef.current = { vx: 0, vy: 0 };
    };

    const movePan = (clientX: number, clientY: number) => {
        if (!isPanning) return;

        const now = performance.now();
        const last = lastPosRef.current;
        const dt = Math.max(8, now - last.t);

        const dx = clientX - last.x;
        const dy = clientY - last.y;

        const t = transformRef.current;
        props.onTransformChange({ ...t, x: t.x + dx, y: t.y + dy });

        velocityRef.current = { vx: dx / dt, vy: dy / dt };
        lastPosRef.current = { x: clientX, y: clientY, t: now };
    };

    const endPan = () => {
        if (!isPanning) return;
        setIsPanning(false);

        const { vx, vy } = velocityRef.current;
        if (Math.hypot(vx, vy) < 0.15) return;

        const friction = 0.92;
        const step = () => {
            const v = velocityRef.current;
            const nextVx = v.vx * friction;
            const nextVy = v.vy * friction;
            velocityRef.current = { vx: nextVx, vy: nextVy };

            const t = transformRef.current;
            props.onTransformChange({ ...t, x: t.x + nextVx * 16, y: t.y + nextVy * 16 });

            if (Math.hypot(nextVx, nextVy) < 0.02) {
                rafRef.current = null;
                return;
            }
            rafRef.current = requestAnimationFrame(step);
        };

        rafRef.current = requestAnimationFrame(step);
    };

    // Wheel: pan + ctrl/meta = zoom
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        stopInertia();

        const isZoom = e.ctrlKey || e.metaKey;
        if (isZoom) {
            const delta = -e.deltaY;
            const factor = delta > 0 ? 1.08 : 0.92;
            const t = transformRef.current;
            const nextScale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
            zoomAt(e.clientX, e.clientY, nextScale);
            return;
        }

        const dx = -e.deltaX;
        const dy = -e.deltaY;
        const panX = Math.abs(dx) > 0 ? dx : dy; // wheel vertical -> pan horizontal
        const panY = Math.abs(dx) > 0 ? dy : 0;

        nudgePan(panX, panY);
    };

    // background grid (premium)
    const backgroundStyle = useMemo(() => {
        const { x, y, scale } = props.transform;
        return {
            backgroundSize: `${48 * scale}px ${48 * scale}px`,
            backgroundPosition: `${x}px ${y}px`,
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.16) 1px, transparent 0)",
        } as React.CSSProperties;
    }, [props.transform]);

    // DnD preview index
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDraggingOver(true);

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const { x, scale } = transformRef.current;

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
            const data = JSON.parse(e.dataTransfer.getData("application/json")) as DragPayload;
            props.onDropPlacement(data, idx);
        } catch {
            // ignore
        }
    };

    const isPanBlocked = (target: HTMLElement) =>
        !!(
            target.closest("button") ||
            target.closest(".interactive-area") ||
            target.closest(".no-pan") ||
            target.closest("a") ||
            target.closest("input") ||
            target.closest("textarea") ||
            target.closest("select")
        );

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (isPanBlocked(target)) return;
        props.onSelectItem(null);
        startPan(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: React.MouseEvent) => movePan(e.clientX, e.clientY);
    const handleMouseUp = () => endPan();

    const handleTouchStart = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        if (isPanBlocked(target)) return;

        stopInertia();

        if (e.touches.length === 1) {
            const t = e.touches[0];
            props.onSelectItem(null);
            startPan(t.clientX, t.clientY);
            pinchRef.current = null;
            return;
        }

        if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dx = t2.clientX - t1.clientX;
            const dy = t2.clientY - t1.clientY;
            const dist = Math.hypot(dx, dy);

            setIsPanning(false);
            pinchRef.current = { active: true, startDist: dist, startScale: transformRef.current.scale };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchRef.current?.active) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dx = t2.clientX - t1.clientX;
            const dy = t2.clientY - t1.clientY;
            const dist = Math.hypot(dx, dy);

            const midX = (t1.clientX + t2.clientX) / 2;
            const midY = (t1.clientY + t2.clientY) / 2;

            const ratio = dist / Math.max(10, pinchRef.current.startDist);
            const nextScale = clamp(pinchRef.current.startScale * ratio, MIN_SCALE, MAX_SCALE);
            zoomAt(midX, midY, nextScale);
            return;
        }

        if (e.touches.length === 1) {
            e.preventDefault();
            const t = e.touches[0];
            movePan(t.clientX, t.clientY);
        }
    };

    const handleTouchEnd = () => {
        if (pinchRef.current?.active) {
            pinchRef.current = null;
            return;
        }
        endPan();
    };

    // Controls
    const resetView = () => props.onTransformChange({ x: 0, y: 0, scale: 0.85 });

    const zoomIn = () => {
        const wr = wrapperRef.current?.getBoundingClientRect();
        const cx = wr ? wr.left + wr.width / 2 : 0;
        const cy = wr ? wr.top + wr.height / 2 : 0;
        const t = transformRef.current;
        zoomAt(cx, cy, clamp(t.scale * 1.12, MIN_SCALE, MAX_SCALE));
    };

    const zoomOut = () => {
        const wr = wrapperRef.current?.getBoundingClientRect();
        const cx = wr ? wr.left + wr.width / 2 : 0;
        const cy = wr ? wr.top + wr.height / 2 : 0;
        const t = transformRef.current;
        zoomAt(cx, cy, clamp(t.scale * 0.88, MIN_SCALE, MAX_SCALE));
    };

    // shortcuts
    useEffect(() => {
        const onKeyDown = (ev: KeyboardEvent) => {
            const el = ev.target as HTMLElement | null;
            if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as any).isContentEditable)) return;

            if (ev.key === "Escape") props.onSelectItem(null);
            if (ev.key === "0" && (ev.ctrlKey || ev.metaKey)) {
                ev.preventDefault();
                resetView();
            }
            if ((ev.ctrlKey || ev.metaKey) && (ev.key === "+" || ev.key === "=")) {
                ev.preventDefault();
                zoomIn();
            }
            if ((ev.ctrlKey || ev.metaKey) && ev.key === "-") {
                ev.preventDefault();
                zoomOut();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            ref={wrapperRef}
            className="flex-1 overflow-hidden relative touch-none select-none bg-gradient-to-b from-slate-50 via-white to-slate-50 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
        >
            {/* Ambient + grid */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-rose-200/35 blur-3xl" />
                <div className="absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-amber-200/35 blur-3xl" />
                <div className="absolute inset-0 opacity-[0.22]" style={backgroundStyle} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/[0.04] via-transparent to-white/[0.02]" />
            </div>

            {/* Controls */}
            <div className="absolute top-4 left-4 z-30 pointer-events-none">
                <div className="pointer-events-auto inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-1">
                    <button type="button" onClick={zoomOut} className="p-2 rounded-xl hover:bg-slate-100 text-slate-700" aria-label="Zoom out">
                        <ZoomOut size={16} />
                    </button>
                    <button type="button" onClick={zoomIn} className="p-2 rounded-xl hover:bg-slate-100 text-slate-700" aria-label="Zoom in">
                        <ZoomIn size={16} />
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button type="button" onClick={resetView} className="p-2 rounded-xl hover:bg-slate-100 text-slate-700" aria-label="Reset view">
                        <RotateCcw size={16} />
                    </button>
                </div>
                <div className="mt-2 hidden md:block text-[11px] text-slate-500 bg-white/70 backdrop-blur rounded-xl border border-slate-200 px-3 py-1 shadow-sm">
                    Astuces : molette = déplacer • Ctrl/⌘ + molette = zoom • Pinch = zoom (mobile)
                </div>
            </div>

            {/* Content */}
            <div
                ref={containerRef}
                className="absolute origin-top-left flex items-center h-full min-w-max transition-transform duration-75 ease-out"
                style={{
                    transform: `translate(${props.transform.x}px, ${props.transform.y}px) scale(${props.transform.scale})`,
                    paddingLeft: `${PADDING_LEFT}px`,
                    paddingRight: `${PADDING_LEFT}px`,
                }}
            >
                {/* Axis (gradient basé sur les items) */}
                {props.timeline.length > 0 ? (
                    <>
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 -z-10 rounded-full" style={{ backgroundImage: axisGradient }} />
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-10 -z-20 opacity-60 blur-2xl rounded-full" style={{ backgroundImage: axisGradient }} />
                        <div
                            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] -z-10 opacity-25"
                            style={{
                                backgroundImage:
                                    "repeating-linear-gradient(to right, rgba(15,23,42,0.25) 0px, rgba(15,23,42,0.25) 8px, transparent 8px, transparent 20px)",
                            }}
                            aria-hidden="true"
                        />
                    </>
                ) : (
                    <div className="absolute left-20 right-20 top-1/2 -translate-y-1/2 h-[2px] -z-10 rounded-full bg-slate-200" />
                )}

                {/* Drop preview (option: utiliser le gradient local si tu veux) */}
                {previewIndex !== null && (
                    <div className="absolute z-0 flex items-center justify-center pointer-events-none" style={{ left: `${previewIndex * ITEM_SLOT_WIDTH}px`, top: "50%", transform: "translateY(-50%)", width: "140px", height: "220px" }}>
                        <div className="relative h-full">
                            <div className="absolute left-1/2 -translate-x-1/2 w-[3px] h-full rounded-full" style={{ backgroundImage: axisGradient, boxShadow: "0 0 0 6px rgba(244,63,94,0.12)" }} />
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 text-white text-[10px] px-3 py-1 shadow-lg">
                                Déposer ici
                            </div>
                        </div>
                    </div>
                )}

                {/* Items */}
                {props.timeline.map((item, index) => {
                    const pal = palettes[index] ?? yearPalette(getYearFromDate(item.date));
                    const isEven = index % 2 === 0;
                    const isSelected = props.selectedItemId === item.uniqueId;
                    const isFirst = index === 0;
                    const isLast = index === props.timeline.length - 1;

                    const itemClass = ["timeline-item interactive-area relative mx-3 md:mx-6 flex justify-center transition-all duration-300", isSelected ? "z-20 scale-[1.06]" : "z-10"].join(" ");
                    const iconBubbleClass = "w-11 h-11 rounded-2xl mb-2.5 flex items-center justify-center border";

                    return (
                        <div
                            key={item.uniqueId}
                            onClick={(e) => {
                                e.stopPropagation();
                                props.onSelectItem(isSelected ? null : item.uniqueId);
                            }}
                            draggable
                            onDragStart={(e) => props.onDragStartTimeline(e, item)}
                            className={itemClass}
                            style={{ minWidth: "160px" }}
                        >
                            {/* Connector teinté par l'item */}
                            <div
                                className="absolute left-1/2 w-[2px] -translate-x-1/2 z-0 transition-all duration-300 opacity-55"
                                style={{
                                    height: "92px",
                                    top: isEven ? "50%" : "auto",
                                    bottom: isEven ? "auto" : "50%",
                                    backgroundImage: pal.connector,
                                }}
                                aria-hidden="true"
                            />

                            {/* Node */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center">
                                <div
                                    className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white mb-1 shadow-sm border border-white/80"
                                    style={{ backgroundImage: pal.chipGradient }}
                                >
                                    {pal.year}
                                </div>
                                <div
                                    className="w-3.5 h-3.5 rounded-full border border-white shadow-md"
                                    style={{ backgroundColor: pal.dot, boxShadow: `0 0 0 6px ${pal.ring}` }}
                                />
                            </div>

                            {/* Card */}
                            <div
                                className="relative w-44 rounded-2xl border bg-white/90 backdrop-blur shadow-[0_18px_50px_-30px_rgba(2,6,23,0.35)] p-3.5 flex flex-col items-center text-center transition-all hover:-translate-y-0.5"
                                style={{
                                    transform: isEven ? "translateY(115px)" : "translateY(-115px)",
                                    borderColor: pal.border,
                                    boxShadow: isSelected ? `0 0 0 4px ${pal.ring}, 0 18px 50px -30px rgba(2,6,23,0.35)` : "0 18px 50px -30px rgba(2,6,23,0.35)",
                                }}
                            >
                                {isSelected && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                props.onDeleteItem(item.uniqueId);
                                                props.onSelectItem(null);
                                            }}
                                            className="absolute -top-3 -right-3 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full shadow-lg animate-in zoom-in duration-200 z-30"
                                            aria-label="Supprimer de la timeline"
                                        >
                                            <Trash2 size={12} />
                                        </button>

                                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-1 z-30 animate-in slide-in-from-top-2 duration-200">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    props.onMoveItem(item.uniqueId, -1);
                                                }}
                                                disabled={isFirst}
                                                className={["p-2 rounded-full shadow-md text-white transition-all", isFirst ? "bg-slate-300 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"].join(" ")}
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
                                                className={["p-2 rounded-full shadow-md text-white transition-all", isLast ? "bg-slate-300 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"].join(" ")}
                                                aria-label="Déplacer à droite"
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Icon bubble teintée */}
                                <div className={iconBubbleClass} style={{ backgroundColor: pal.iconBg, borderColor: pal.border, color: pal.text }}>
                                    {item.isGenerated ? <Wand2 size={18} /> : item.type === "video" ? <Video size={18} /> : <ImageIcon size={18} />}
                                </div>

                                <h3 className="font-semibold text-[13px] leading-tight mb-1 truncate w-full" style={{ color: pal.text }}>
                                    {item.title}
                                </h3>

                                {item.isGenerated ? (
                                    <div className="text-[10px] px-2 py-1 rounded-xl w-full mt-1 text-left truncate border" style={{ backgroundColor: pal.lightBg, borderColor: pal.border, color: pal.text }}>
                                        <Wand2 size={10} className="inline mr-1" />
                                        {item.context || "AI"}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Original</p>
                                )}

                                {/* caret */}
                                <div
                                    className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white/90 border transform rotate-45"
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
                })}
            </div>

            {/* Empty state */}
            {props.timeline.length === 0 && !isDraggingOver && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-10 text-center">
                    <div className="bg-white/85 backdrop-blur p-7 rounded-3xl border border-slate-200 shadow-[0_22px_60px_-40px_rgba(2,6,23,0.35)]">
                        <Film className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
                        <p className="text-slate-700 text-sm font-semibold">Timeline vide</p>
                        <p className="text-xs text-slate-500 mt-1">Glissez des médias ici, ou touchez un élément de la bibliothèque.</p>
                        <p className="text-[11px] text-slate-400 mt-3">Mobile : 1 doigt = déplacer • 2 doigts = zoom</p>
                    </div>
                </div>
            )}
        </div>
    );
}
