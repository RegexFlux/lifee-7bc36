"use client";

import type { TimelineItem } from "@/types/studio";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TimelineCanvasView } from "@/components/studio/TimelineCanvasView";

type DragPayload = { item: any; source: "library" | "timeline" };

const DEFAULT_PADDING_LEFT = 160;
const MIN_SCALE = 0.35;
const MAX_SCALE = 1.75;

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function getYearFromDate(d?: string) {
    return d?.split("/")[1] || d || "";
}

/** pseudo-random deterministic hue (SSR-safe) */
function hashToHue(input: string) {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h) % 360;
}

export type YearPalette = {
    year: string;
    a: string;
    b: string;
    chipGradient: string;
    dot: string;
    border: string;
    ring: string;
    lightBg: string;
    iconBg: string;
    text: string;
};

function yearPalette(year: string): YearPalette {
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
        text: `hsl(${hue} 45% 28%)`,
    };
}

export type ItemMetrics = {
    id: string;
    left: number;
    width: number;
    center: number;
};

export type YearTick = {
    year: string;
    x: number;
};

export function TimelineCanvas(props: {
    timeline: TimelineItem[];

    selectedItemId: string | null;
    onSelectItem: (id: string | null) => void;

    transform: { x: number; y: number; scale: number };
    onTransformChange: (t: { x: number; y: number; scale: number }) => void;

    paddingLeft?: number;

    onDragStartTimeline: (e: React.DragEvent, item: TimelineItem) => void;
    onDropPlacement: (payload: DragPayload, index: number) => void;

    onDeleteItem: (uniqueId: string) => void;
    onMoveItem: (uniqueId: string, direction: -1 | 1) => void;

    onRenameItem?: (uniqueId: string, title: string) => void;
    onDuplicateItem?: (uniqueId: string) => void;
    onReplaceItem?: (uniqueId: string) => void;
    onOpenAsset?: (assetId: string) => void;
}) {
    const PADDING_LEFT = props.paddingLeft ?? DEFAULT_PADDING_LEFT;

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const transformRef = useRef(props.transform);
    useEffect(() => {
        transformRef.current = props.transform;
    }, [props.transform]);

    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [previewX, setPreviewX] = useState<number | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const palettes = useMemo(() => {
        return props.timeline.map((it) => yearPalette(getYearFromDate(it.date)));
    }, [props.timeline]);

    // --- measure items (offsetLeft/offsetWidth in non-transformed coords) ---
    const [metrics, setMetrics] = useState<ItemMetrics[]>([]);
    const [axis, setAxis] = useState<{ start: number; end: number } | null>(null);
    const [yearTicks, setYearTicks] = useState<YearTick[]>([]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const read = () => {
            const items = Array.from(el.querySelectorAll('[data-timeline-item="1"]')) as HTMLElement[];
            const next: ItemMetrics[] = items.map((it) => {
                const left = it.offsetLeft;
                const width = it.offsetWidth;
                return { id: it.getAttribute("data-id") || "", left, width, center: left + width / 2 };
            });

            setMetrics(next);

            if (next.length >= 1) {
                const start = next[0].left;
                const last = next[next.length - 1];
                const end = last.left + last.width;
                setAxis({ start, end });
            } else {
                setAxis(null);
            }

            // year group ticks (label once per year change)
            const ticks: YearTick[] = [];
            for (let i = 0; i < props.timeline.length; i++) {
                const y = getYearFromDate(props.timeline[i]?.date);
                const prev = i > 0 ? getYearFromDate(props.timeline[i - 1]?.date) : null;
                if (i === 0 || y !== prev) {
                    const m = next[i];
                    if (m) ticks.push({ year: y || "—", x: m.left });
                }
            }
            setYearTicks(ticks);
        };

        read();

        const ro = new ResizeObserver(() => read());
        ro.observe(el);
        return () => ro.disconnect();
    }, [props.timeline]);

    // axis gradient based on items (stops)
    const axisGradient = useMemo(() => {
        const n = palettes.length;
        if (n === 0) return "linear-gradient(90deg, rgba(148,163,184,0.50), rgba(148,163,184,0.50))";
        if (n === 1) return `linear-gradient(90deg, ${palettes[0].a}, ${palettes[0].b})`;
        const stops: string[] = [];
        for (let i = 0; i < n; i++) {
            const p = (i / (n - 1)) * 100;
            stops.push(`${palettes[i].a} ${p}%`);
        }
        return `linear-gradient(90deg, ${stops.join(", ")})`;
    }, [palettes]);

    // --- preview gradient based on neighbors ---
    const previewGradient = useMemo(() => {
        if (previewIndex === null) return "linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.9))";
        const left = palettes[Math.max(0, previewIndex - 1)];
        const right = palettes[Math.min(palettes.length - 1, previewIndex)];
        const a = left?.dot || "#fb7185";
        const b = right?.dot || "#f59e0b";
        return `linear-gradient(180deg, ${a}, ${b})`;
    }, [previewIndex, palettes]);

    // --- interactions (simple) ---
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

    const [isPanning, setIsPanning] = useState(false);
    const lastRef = useRef({ x: 0, y: 0 });

    const startPan = (x: number, y: number) => {
        setIsPanning(true);
        lastRef.current = { x, y };
    };

    const movePan = (x: number, y: number) => {
        if (!isPanning) return;
        const dx = x - lastRef.current.x;
        const dy = y - lastRef.current.y;
        lastRef.current = { x, y };

        const t = transformRef.current;
        props.onTransformChange({ ...t, x: t.x + dx, y: t.y + dy });
    };

    const endPan = () => setIsPanning(false);

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

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const isZoom = e.ctrlKey || e.metaKey;
        if (isZoom) {
            const factor = -e.deltaY > 0 ? 1.08 : 0.92;
            const t = transformRef.current;
            zoomAt(e.clientX, e.clientY, clamp(t.scale * factor, MIN_SCALE, MAX_SCALE));
            return;
        }

        // wheel vertical => pan horizontal (studio feeling)
        const dx = -e.deltaY;
        const t = transformRef.current;
        props.onTransformChange({ ...t, x: t.x + dx });
    };

    // --- drag/drop placement (fixed) ---
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDraggingOver(true);

        const wr = wrapperRef.current?.getBoundingClientRect();
        if (!wr) return;

        const t = transformRef.current;
        const x = (e.clientX - wr.left - t.x) / t.scale;

        // empty timeline
        if (metrics.length === 0) {
            setPreviewIndex(0);
            setPreviewX(PADDING_LEFT);
            return;
        }

        // find insertion idx by comparing with centers
        let idx = metrics.findIndex((m) => x < m.center);
        if (idx === -1) idx = metrics.length;

        // boundary position (between items)
        let boundaryX = 0;
        if (idx === 0) {
            boundaryX = metrics[0].left;
        } else if (idx === metrics.length) {
            const last = metrics[metrics.length - 1];
            boundaryX = last.left + last.width;
        } else {
            boundaryX = (metrics[idx - 1].center + metrics[idx].center) / 2;
        }

        setPreviewIndex(idx);
        setPreviewX(boundaryX);
    };

    const handleDragLeave = () => {
        setIsDraggingOver(false);
        setPreviewIndex(null);
        setPreviewX(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);

        const idx = previewIndex ?? props.timeline.length;
        setPreviewIndex(null);
        setPreviewX(null);

        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json")) as DragPayload;
            props.onDropPlacement(data, idx);
        } catch {
            // ignore
        }
    };

    // background grid
    const backgroundStyle = useMemo(() => {
        const { x, y, scale } = props.transform;
        return {
            backgroundSize: `${52 * scale}px ${52 * scale}px`,
            backgroundPosition: `${x}px ${y}px`,
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.14) 1px, transparent 0)",
        } as React.CSSProperties;
    }, [props.transform]);

    return (
        <div
            ref={wrapperRef}
            className="flex-1 overflow-hidden relative touch-none select-none bg-gradient-to-b from-slate-50 via-white to-slate-50 cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onMouseDown={(e) => {
                const target = e.target as HTMLElement;
                if (isPanBlocked(target)) return;
                props.onSelectItem(null);
                startPan(e.clientX, e.clientY);
            }}
            onMouseMove={(e) => movePan(e.clientX, e.clientY)}
            onMouseUp={endPan}
            onMouseLeave={endPan}
            onTouchStart={(e) => {
                const target = e.target as HTMLElement;
                if (isPanBlocked(target)) return;
                const t = e.touches[0];
                props.onSelectItem(null);
                startPan(t.clientX, t.clientY);
            }}
            onTouchMove={(e) => {
                e.preventDefault();
                const t = e.touches[0];
                movePan(t.clientX, t.clientY);
            }}
            onTouchEnd={endPan}
        >
            {/* Ambient + grid */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-rose-200/35 blur-3xl" />
                <div className="absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-amber-200/35 blur-3xl" />
                <div className="absolute inset-0 opacity-[0.22]" style={backgroundStyle} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/[0.04] via-transparent to-white/[0.02]" />
            </div>

            <div
                ref={containerRef}
                className="absolute origin-top-left flex items-center h-full min-w-max transition-transform duration-75 ease-out"
                style={{
                    transform: `translate(${props.transform.x}px, ${props.transform.y}px) scale(${props.transform.scale})`,
                    paddingLeft: `${PADDING_LEFT}px`,
                    paddingRight: `${PADDING_LEFT}px`,
                }}
            >
                <TimelineCanvasView
                    timeline={props.timeline}
                    palettes={palettes}
                    selectedItemId={props.selectedItemId}
                    onSelectItem={props.onSelectItem}
                    onDragStartTimeline={props.onDragStartTimeline}
                    onDeleteItem={props.onDeleteItem}
                    onMoveItem={props.onMoveItem}
                    onRenameItem={props.onRenameItem}
                    onDuplicateItem={props.onDuplicateItem}
                    onReplaceItem={props.onReplaceItem}
                    onOpenAsset={props.onOpenAsset}
                    axisGradient={axisGradient}
                    axisStart={axis?.start ?? null}
                    axisEnd={axis?.end ?? null}
                    yearTicks={yearTicks}
                    previewIndex={previewIndex}
                    previewX={previewX}
                    previewGradient={previewGradient}
                    showEmpty={!isDraggingOver && props.timeline.length === 0}
                />
            </div>
        </div>
    );
}
