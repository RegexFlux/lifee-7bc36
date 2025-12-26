"use client";

import type { TimelineItem } from "@/types/studio";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {
    ArrowLeft,
    ArrowRight,
    Copy,
    ExternalLink,
    Image as ImageIcon,
    Trash2,
    Video,
    Wand2,
    RefreshCcw,
} from "lucide-react";
import type { YearPalette } from "./TimelineCanvas";
import {VideoPlayer} from "@/components/VideoPlayer";
import {studioApi} from "@/lib/studioApi";
import {useClipVideoUrl} from "@/hooks/useClipVideoUrl";
import {cx} from "@/components/effects/StudioOpening";

function getYearFromDate(d?: string) {
    return d?.split("/")[1] || d || "";
}

function getPreviewSrc(item: any): string | undefined {
    // Tolérant: adapte ici si ton schéma est connu / strict
    return (
        item?.previewUrl ||
        item?.thumbUrl ||
        item?.thumbnailUrl ||
        item?.posterUrl ||
        item?.url ||
        item?.src ||
        item?.assetUrl ||
        item?.asset?.previewUrl ||
        item?.asset?.thumbUrl ||
        item?.asset?.url ||
        item?.asset?.signedUrl ||
        undefined
    );
}

function looksLikeVideo(url?: string) {
    if (!url) return false;
    return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

function clampStyle(lines: number): React.CSSProperties {
    return {
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical" as any,
        overflow: "hidden",
    };
}

function Preview({
                     item,
                     pal,
                     isSelected,
                     onOpen,
                 }: {
    item: TimelineItem;
    pal: YearPalette;
    isSelected: boolean;
    onOpen?: () => void;
}) {
    const src = useMemo(() => getPreviewSrc(item), [item]);

    const { url, loading } = useClipVideoUrl(
        item.type === "video" ? item.id : undefined
    );


    return (
        <div
            data-tour="playback"
            className="relative rounded-2xl overflow-hidden border bg-white/60 backdrop-blur-sm"
            style={{
                borderColor: pal.border,
                boxShadow: `0 10px 30px -18px rgba(2,6,23,0.35)`,
            }}
        >
            {/* Aspect ratio */}
            <div className="relative w-full" style={{ paddingTop: "62%" }}>
                {/* Media layer */}
                <div className="absolute inset-0">
                    {/* Media layer */}
                    {!url && (
                        <img
                            src={src}
                            className="w-full h-full object-cover opacity-90"
                            alt=""
                        />
                    )}

                    {/* Vidéo quand prête */}
                    {url && (
                        <VideoPlayer videoUrl={url} />
                    )}

                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs">
                            Chargement…
                        </div>
                    )}

                    {/* Top overlay badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-2">
                        <div
                            className="px-2 py-1 rounded-full text-[10px] font-semibold border bg-white/80 backdrop-blur"
                            style={{ borderColor: pal.border, color: pal.text }}
                        >
                            {item.type === "video" ? "Vidéo" : "Photo"}
                        </div>

                        {item.isGenerated && (
                            <div
                                className="px-2 py-1 rounded-full text-[10px] font-bold text-white border"
                                style={{
                                    borderColor: "rgba(255,255,255,0.35)",
                                    backgroundImage: pal.chipGradient,
                                }}
                            >
                                Généré
                            </div>
                        )}
                    </div>

                    {/* Click affordance */}
                    {onOpen && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpen();
                            }}
                            className="absolute top-2 right-2 p-2 rounded-full bg-black/35 hover:bg-black/45 text-white backdrop-blur border border-white/20 transition"
                            aria-label="Ouvrir l’asset"
                            title="Ouvrir"
                        >
                            <ExternalLink size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
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

    onDelete: (id: string) => void;
    onMove: (id: string, direction: -1 | 1) => void;

    onRenameItem?: (id: string, title: string) => void;
    onDuplicateItem?: (id: string) => void;
    onReplaceItem?: (id: string) => void;
    onOpenAsset?: (assetId: string) => void;
}) {
    const { item, palette: pal } = props;

    const isEven = props.index % 2 === 0;
    const yearStr = getYearFromDate(item.date) || pal.year;

    const icon = item.isGenerated ? <Wand2 size={16} /> : item.type === "video" ? <Video size={16} /> : <ImageIcon size={16} />;

    // ---------------- RESIZE (width) ----------------
    const MIN_W = 210;
    const MAX_W = 480;

    const storageKey = `lifee_timeline_item_w_${item.id}`;

    const [cardW, setCardW] = useState<number>(() => {
        try {
            const v = localStorage.getItem(storageKey);
            const n = v ? Number(v) : 230;
            return Number.isFinite(n) ? Math.max(MIN_W, Math.min(MAX_W, n)) : 230;
        } catch {
            return 230;
        }
    });

    useEffect(() => {
        // when item changes, reload persisted size
        try {
            const v = localStorage.getItem(storageKey);
            const n = v ? Number(v) : 230;
            setCardW(Number.isFinite(n) ? Math.max(MIN_W, Math.min(MAX_W, n)) : 230);
        } catch {
            setCardW(230);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.id]);

    const resizingRef = useRef(false);
    const startRef = useRef({ x: 0, w: 230 });

    const onResizePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        resizingRef.current = true;
        startRef.current = { x: e.clientX, w: cardW };

        // capture pointer so the drag stays even if you move fast
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

        // make cursor global
        const prevCursor = document.body.style.cursor;
        document.body.style.cursor = "nwse-resize";

        const onMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startRef.current.x;
            const next = Math.max(MIN_W, Math.min(MAX_W, Math.round(startRef.current.w + dx)));
            setCardW(next);
        };

        const onUp = () => {
            resizingRef.current = false;
            document.body.style.cursor = prevCursor;

            try {
                localStorage.setItem(storageKey, String(cardW));
            } catch {}

            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerup", onUp, { passive: true });
        window.addEventListener("pointercancel", onUp, { passive: true });
    };

    // Prevent dragstart while resizing or if drag originates from the handle
    const onDragStartSafe = (e: React.DragEvent) => {
        const t = e.target as HTMLElement | null;
        if (resizingRef.current || t?.closest?.('[data-resize-handle="1"]')) {
            e.preventDefault();
            return;
        }
        props.onDragStart(e, item);
    };

    // Keep container wide enough so layout doesn’t collapse when cardW grows
    const containerMinW = Math.max(210, cardW + 40);

    return (
        <div
            data-timeline-item="1"
            data-id={item.id}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    props.onSelect(props.isSelected ? null : item.id);
                }
            }}
            onClick={(e) => {
                e.stopPropagation();
                props.onSelect(props.isSelected ? null : item.id);
            }}
            draggable
            onDragStart={onDragStartSafe}
            className={
                "timeline-item interactive-area relative mx-5 md:mx-8 flex justify-center transition-transform duration-300 -translate-y-3.5" +
                (props.isSelected ? " z-20 scale-[1.05]" : " z-10")
            }
            style={{ minWidth: `${containerMinW}px` }}
        >
            {/* Connector */}
            <div
                className="absolute left-1/2 w-[2px] -translate-x-1/2 z-0 opacity-60"
                style={{
                    height: "110px",
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
                <div className="w-3.5 h-3.5 rounded-full border border-white shadow-md" style={{ backgroundColor: pal.dot, boxShadow: `0 0 0 7px ${pal.ring}` }} />
            </div>

            {/* Card */}
            <div
                data-tour="card"
                className={
                    "group relative rounded-[22px] border bg-white/82 backdrop-blur " +
                    "p-3.5 flex flex-col text-left transition-all duration-300 " +
                    "hover:-translate-y-0.5"
                }
                style={{
                    width: `${cardW}px`,
                    transform: isEven ? "translateY(250px)" : "translateY(-250px)",
                    borderColor: pal.border,
                    boxShadow: props.isSelected
                        ? `0 0 0 5px ${pal.ring}, 0 22px 60px -36px rgba(2,6,23,0.55)`
                        : "0 22px 60px -36px rgba(2,6,23,0.45)",
                }}
            >
                {/* Preview */}
                <Preview
                    item={item}
                    pal={pal}
                    isSelected={props.isSelected}
                    onOpen={props.onOpenAsset ? () => props.onOpenAsset?.((item as any).assetId || item.id) : undefined}
                />

                {/* Header row */}
                <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0"
                            style={{
                                backgroundColor: pal.iconBg,
                                borderColor: pal.border,
                                color: pal.text,
                            }}
                            aria-hidden="true"
                        >
                            {icon}
                        </div>

                        <div className="min-w-0">
                            <div className="text-[12px] font-semibold leading-snug truncate" style={{ color: pal.text }} title={item.title}>
                                {item.title || "Sans titre"}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                                <span className="font-medium">{yearStr}</span>
                                <span className="opacity-70"> • </span>
                                <span className="opacity-90">{item.type === "video" ? "Vidéo" : "Photo"}</span>
                            </div>
                        </div>
                    </div>

                    {props.isSelected && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                props.onDelete(item.id);
                                props.onSelect(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-full shadow-lg transition"
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
                            className="text-[11px] px-3 py-2.5 rounded-2xl border leading-snug"
                            style={{
                                backgroundColor: pal.lightBg,
                                borderColor: pal.border,
                                color: pal.text,
                            }}
                            title={item.context || ""}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">Prompt</span>
                                <span className="text-[10px] opacity-70">AI</span>
                            </div>
                            <div className="mt-1 opacity-90" style={clampStyle(3)}>
                                {item.context || "—"}
                            </div>
                        </div>
                    ) : (
                        <div className="text-[11px] px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600">
                            <span className="font-semibold">Source</span>
                            <span className="opacity-70"> · </span>
                            <span>Original</span>
                        </div>
                    )}
                </div>

                {/* Secondary actions */}
                <div className={"mt-3 flex items-center justify-between gap-2 transition-opacity " + (props.isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onMove(item.id, -1);
                        }}
                        disabled={props.isFirst}
                        className={
                            "p-2 rounded-full shadow-md transition-all border " +
                            (props.isFirst ? "bg-white/60 text-slate-300 border-slate-200 cursor-not-allowed" : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800")
                        }
                        aria-label="Déplacer à gauche"
                        title="Déplacer à gauche"
                    >
                        <ArrowLeft size={14} />
                    </button>

                    <div className="flex items-center gap-2">
                        {props.onDuplicateItem && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    props.onDuplicateItem?.(item.id);
                                }}
                                className="p-2 rounded-full border bg-white/70 hover:bg-white transition"
                                style={{ borderColor: pal.border, color: pal.text }}
                                aria-label="Dupliquer"
                                title="Dupliquer"
                            >
                                <Copy size={14} />
                            </button>
                        )}

                        {props.onReplaceItem && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    props.onReplaceItem?.(item.id);
                                }}
                                className="p-2 rounded-full border bg-white/70 hover:bg-white transition"
                                style={{ borderColor: pal.border, color: pal.text }}
                                aria-label="Remplacer"
                                title="Remplacer"
                            >
                                <RefreshCcw size={14} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onMove(item.id, 1);
                        }}
                        disabled={props.isLast}
                        className={
                            "p-2 rounded-full shadow-md transition-all border " +
                            (props.isLast ? "bg-white/60 text-slate-300 border-slate-200 cursor-not-allowed" : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800")
                        }
                        aria-label="Déplacer à droite"
                        title="Déplacer à droite"
                    >
                        <ArrowRight size={14} />
                    </button>
                </div>

                {/* ✅ Resize handle (only when selected or hover) */}
                <div
                    data-resize-handle="1"
                    onPointerDown={onResizePointerDown}
                    className={cx(
                        "absolute -bottom-2 -right-2 z-30",
                        "h-8 w-8 rounded-2xl",
                        "grid place-items-center",
                        "bg-white/85 ring-1 ring-slate-200 shadow-lg",
                        "backdrop-blur",
                        "cursor-nwse-resize touch-none select-none",
                        props.isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    aria-label="Redimensionner"
                    title="Redimensionner"
                >
                    {/* nice diagonal grip */}
                    <div className="h-4 w-4 rotate-45 opacity-70">
                        <div className="h-[2px] w-full bg-slate-400 rounded-full mb-[3px]" />
                        <div className="h-[2px] w-full bg-slate-400 rounded-full mb-[3px]" />
                        <div className="h-[2px] w-full bg-slate-400 rounded-full" />
                    </div>
                </div>

                {/* Caret */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white/82 border transform rotate-45"
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

