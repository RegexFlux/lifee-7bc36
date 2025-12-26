"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Asset } from "@/types/studio";
import { LibraryItemCard } from "./LibraryItemCard";
import {
    ChevronDown,
    Image as ImageIcon,
    Video,
    LayoutGrid,
    ListTree,
    Trash2,
    GripHorizontal,
    Play,
    Lock,
    Loader2,
    Sparkles,
    CheckCircle2,
    XCircle,
} from "lucide-react";

export type ViewMode = "tree" | "cards";
type JobStatus = "failed" | "starting" | "processing" | "succeeded" | undefined | null;

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function normalizeProgress(raw: unknown): number | null {
    if (raw === null || raw === undefined) return null;
    const num =
        typeof raw === "number"
            ? raw
            : typeof raw === "string"
                ? Number(raw)
                : NaN;
    if (!Number.isFinite(num)) return null;
    const p01 = num > 1.01 ? num / 100 : num;
    return clamp(p01, 0, 1);
}

function parseMonthYear(date?: string) {
    // attendu: "MM/YYYY"
    if (!date || !date.includes("/")) return { year: 0, month: 0 };
    const [mm, yyyy] = date.split("/");
    const month = Number(mm) || 0;
    const year = Number(yyyy) || 0;
    return { year, month };
}

function monthNameFR(month: number) {
    // month: 1..12
    const names = [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
    ];
    return month >= 1 && month <= 12 ? names[month - 1] : "Sans mois";
}

function getYearKey(date?: string) {
    const { year } = parseMonthYear(date);
    return year > 0 ? String(year) : "Sans date";
}

function getMonthKey(date?: string) {
    const { year, month } = parseMonthYear(date);
    if (year <= 0 || month <= 0) return "Sans date";
    return `${String(month).padStart(2, "0")}/${year}`;
}

function sortYearKeysDesc(a: string, b: string) {
    if (a === "Sans date") return 1;
    if (b === "Sans date") return -1;
    return Number(b) - Number(a);
}

function sortMonthKeysDesc(a: string, b: string) {
    if (a === "Sans date") return 1;
    if (b === "Sans date") return -1;
    // "MM/YYYY"
    const [am, ay] = a.split("/");
    const [bm, by] = b.split("/");
    const ya = Number(ay) || 0;
    const yb = Number(by) || 0;
    const ma = Number(am) || 0;
    const mb = Number(bm) || 0;
    if (ya !== yb) return yb - ya; // sécurité
    return mb - ma;
}

function sortAssetsDesc(a: Asset, b: Asset) {
    const pa = parseMonthYear(a.date);
    const pb = parseMonthYear(b.date);
    if (pa.year !== pb.year) return pb.year - pa.year;
    if (pa.month !== pb.month) return pb.month - pa.month;
    return String((a.title || "").localeCompare(String(b.title || "")));
}

export function usePersistedState<T>(key: string, initial: T) {
    const [value, setValue] = useState<T>(initial);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            setValue(JSON.parse(raw));
        } catch {
            // ignore
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore
        }
    }, [key, value]);

    return [value, setValue] as const;
}

/* ---------- UI atoms ---------- */

export function ViewSwitch(props: { value: ViewMode; onChange: (v: ViewMode) => void }) {
    return (
        <div className="inline-flex items-center rounded-2xl bg-white/80 backdrop-blur ring-1 ring-slate-200 p-1 shadow-sm">
            <button
                type="button"
                onClick={() => props.onChange("tree")}
                aria-pressed={props.value === "tree"}
                className={cx(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                    props.value === "tree" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
            >
                <ListTree size={16} />
                Tree
            </button>
            <button
                type="button"
                onClick={() => props.onChange("cards")}
                aria-pressed={props.value === "cards"}
                className={cx(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                    props.value === "cards" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
            >
                <LayoutGrid size={16} />
                Cards
            </button>
        </div>
    );
}

function CountChip(props: { icon: React.ReactNode; label: string; tone?: "slate" | "indigo" | "rose" }) {
    const tone =
        props.tone === "indigo"
            ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
            : props.tone === "rose"
                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                : "bg-slate-100 text-slate-700";
    return (
        <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold", tone)}>
      {props.icon}
            {props.label}
    </span>
    );
}

function StatusPill(props: { status: JobStatus; progressPct?: number | null }) {
    const s = props.status;
    if (!s) return null;

    const progressTxt =
        s === "processing" && typeof props.progressPct === "number" ? ` · ${props.progressPct}%` : "";

    const common = "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1";
    if (s === "starting") {
        return (
            <span className={cx(common, "bg-amber-50 text-amber-800 ring-amber-200")} title="Préparation">
        <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
        Préparation
      </span>
        );
    }
    if (s === "processing") {
        return (
            <span className={cx(common, "bg-amber-50 text-amber-800 ring-amber-200")} title="Restitution en cours">
        <Sparkles className="h-3.5 w-3.5" />
        Restitution{progressTxt}
      </span>
        );
    }
    if (s === "failed") {
        return (
            <span className={cx(common, "bg-rose-50 text-rose-800 ring-rose-200")} title="Échec">
        <XCircle className="h-3.5 w-3.5" />
        Échec
      </span>
        );
    }
    if (s === "succeeded") {
        return (
            <span className={cx(common, "bg-emerald-50 text-emerald-800 ring-emerald-200")} title="Restitué">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Restitué
      </span>
        );
    }
    return null;
}

/* ---------- Tree view (Figma-ish) ---------- */

type MonthGroup = {
    monthKey: string;
    items: Asset[];
    photos: Asset[];
    videos: Asset[];
};

type YearGroup = {
    yearKey: string;
    months: MonthGroup[];
    photos: Asset[];
    videos: Asset[];
};


function TreeRow(props: {
    depth: 0 | 1 | 2;
    kind: "year" | "month" | "item";
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    isOpen?: boolean;
    onToggle?: () => void;
    childrenBlock?: React.ReactNode;
}) {
    const leftPad = props.depth === 0 ? "pl-3" : props.depth === 1 ? "pl-6" : "pl-10";

    return (
        <div className="relative">
            {/* rail vertical (look figma) */}
            {props.depth > 0 && (
                <div className={cx("absolute left-4 top-0 bottom-0 w-px")} aria-hidden="true" />
            )}
            {props.depth > 1 && (
                <div className={cx("absolute left-8 top-0 bottom-0 w-px bg-slate-200/80")} aria-hidden="true" />
            )}

            <div
                className={cx(
                    "group relative w-full rounded-xl",
                    "transition-colors",
                    props.kind === "item" ? "hover:bg-white" : "hover:bg-white/70"
                )}
            >
                <div className={cx("flex items-center justify-between gap-3 py-2 pr-3", leftPad)}>
                    <div className="min-w-0 flex items-center gap-2">
                        {/* toggle chevron only for nodes */}
                        {props.kind !== "item" ? (
                            <button
                                type="button"
                                onClick={props.onToggle}
                                aria-label={props.isOpen ? "Réduire" : "Déployer"}
                                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-50 text-slate-500"
                            >
                                <ChevronDown
                                    size={16}
                                    className={cx("transition-transform", props.isOpen ? "rotate-0" : "-rotate-90")}
                                />
                            </button>
                        ) : (
                            <div className="h-8 w-8" />
                        )}

                        {/* node dot */}
                        <div className="relative">
                            <div className="h-2 w-2 rounded-full bg-slate-900/60" />
                            <div
                                className="absolute inset-0 rounded-full blur-[6px] opacity-30"
                                style={{ background: "radial-gradient(circle, rgba(244,63,94,0.35), transparent 60%)" }}
                                aria-hidden="true"
                            />
                        </div>

                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-800">{props.title}</div>
                            {props.subtitle ? (
                                <div className="truncate text-[11px] text-slate-500">{props.subtitle}</div>
                            ) : null}
                        </div>
                    </div>

                    {props.right ? <div className="shrink-0 flex items-center gap-2">{props.right}</div> : null}
                </div>
            </div>

            {props.isOpen && props.childrenBlock ? (
                <div className={cx("ml-6 pl-3 border-l border-slate-200/80", props.depth === 0 && "ml-4")}>
                    {props.childrenBlock}
                </div>
            ) : null}
        </div>
    );
}

function TreeItemRow(props: {
    item: Asset;
    onAdd: (a: Asset) => void;
    onDragStart: (e: React.DragEvent, a: Asset) => void;
    onRequestDelete: (a: Asset) => void;
}) {
    const item = props.item as any;
    const isVideo = item.type === "video";
    const isPhoto = item.type === "image";

    const status = item.lastJobStatus as JobStatus;
    const progress01 = normalizeProgress(item.progress);
    const progressPct = progress01 === null ? null : Math.round(progress01 * 100);

    const canDrag = isVideo && (!item.isGenerated || status === "succeeded");
    const isBusy = status === "starting" || status === "processing";

    const isClickable = isPhoto ? !isBusy : canDrag && !isBusy;

    const meta = item.date ? item.date : "";

    return (
        <div className="group relative">
            <div
                role="button"
                tabIndex={0}
                aria-disabled={!isClickable ? true : undefined}
                onClick={() => {
                    if (!isClickable) return;
                    props.onAdd(item);
                }}
                onKeyDown={(e) => {
                    if (!isClickable) return;
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        props.onAdd(item);
                    }
                }}
                className={cx(
                    "flex items-center justify-between gap-3 rounded-xl px-2 py-2",
                    isClickable ? "hover:bg-white cursor-pointer" : "cursor-default opacity-[0.92]"
                )}
            >
                <div className="min-w-0 flex items-center gap-3">

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-800">{item.title}</div>

                            {!canDrag && status ? (
                                <StatusPill status={status} progressPct={progressPct} />
                            ) : null}

                            {!canDrag && !status && !item.isGenerated && isVideo ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  <Lock className="h-3.5 w-3.5" />
                  Non généré
                </span>
                            ) : null}
                        </div>

                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
              <span className={cx("inline-flex items-center gap-1", isVideo ? "text-indigo-700" : "text-rose-700")}>
                {isVideo ? <Video size={13} /> : <ImageIcon size={13} />}
                  {isVideo ? "Vidéo" : "Photo"}
              </span>
                            {meta ? <span className="text-slate-400">• {meta}</span> : null}
                            {isPhoto ? <span className="text-slate-400">• générable</span> : null}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onRequestDelete(item);
                        }}
                        className={cx(
                            "p-2 rounded-xl border border-transparent",
                            "text-slate-400 hover:text-rose-600",
                            "hover:border-slate-200 hover:bg-white",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                        )}
                        title="Supprimer"
                        aria-label={`Supprimer ${item.title}`}
                    >
                        <Trash2 size={16} />
                    </button>

                    {/* drag handle only if allowed */}
                    {canDrag ? (
                        <div
                            draggable
                            onDragStart={(e) => {
                                e.stopPropagation();
                                props.onDragStart(e, item);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={cx(
                                "hidden md:flex items-center",
                                "p-2 rounded-xl border border-transparent",
                                "text-slate-300 group-hover:text-slate-700",
                                "hover:bg-white hover:border-slate-200",
                                "cursor-grab active:cursor-grabbing transition-colors"
                            )}
                            title="Glisser"
                            aria-label={`Glisser ${item.title}`}
                            role="button"
                            tabIndex={-1}
                        >
                            <GripHorizontal size={16} />
                        </div>
                    ) : (
                        <></>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ---------- Cards view (same spirit, but premium) ---------- */

function YearCardsSection(props: {
    year: string;
    videos: Asset[];
    photos: Asset[];
    collapsed: boolean;
    onToggle: () => void;
    onAdd: (a: Asset) => void;
    onDragStart: (e: React.DragEvent, a: Asset) => void;
    onRequestDelete: (a: Asset) => void;
}) {
    const total = props.videos.length + props.photos.length;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={props.onToggle}
                aria-expanded={!props.collapsed}
                className="w-full px-4 py-3 hover:bg-white transition-colors"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-slate-900/5 ring-1 ring-slate-200 grid place-items-center">
                            <div className="h-2 w-2 rounded-full bg-rose-500" />
                        </div>

                        <div className="min-w-0 text-left">
                            <div className="truncate text-sm font-bold text-slate-800">{props.year}</div>
                            <div className="text-[11px] text-slate-500">
                                {total} élément{total > 1 ? "s" : ""}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {props.videos.length > 0 && (
                            <CountChip icon={<Video size={14} />} label={String(props.videos.length)} tone="indigo" />
                        )}
                        {props.photos.length > 0 && (
                            <CountChip icon={<ImageIcon size={14} />} label={String(props.photos.length)} tone="rose" />
                        )}
                        <ChevronDown
                            size={18}
                            className={cx("text-slate-400 transition-transform", props.collapsed ? "-rotate-90" : "rotate-0")}
                        />
                    </div>
                </div>
            </button>

            {!props.collapsed && (
                <div className="px-5 pb-3">
                    <div className="grid gap-3 grid-cols-1">
                        {/* VIDEOS column */}
                        {props.videos.length > 0 && (
                            <div className="overflow-hidden">
                                <div className="py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
                                        <Video size={14} className="text-indigo-500" />
                                        Vidéos
                                    </div>
                                    <div className="text-[11px] text-slate-400">{props.videos.length}</div>
                                </div>
                                <div className="pb-2 space-y-2">
                                    {props.videos.map((item) => (
                                        <LibraryItemCard
                                            key={(item as any).id}
                                            item={item as any}
                                            onAdd={props.onAdd}
                                            onDragStart={props.onDragStart}
                                            onRequestDelete={props.onRequestDelete}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PHOTOS column */}
                        {props.photos.length > 0 && (
                            <div className="bg-white/70 overflow-hidden">
                                <div className="px-3 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
                                        <ImageIcon size={14} className="text-rose-500" />
                                        Photos <span className="text-[11px] font-medium text-slate-400 normal-case">(générables)</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400">{props.photos.length}</div>
                                </div>
                                <div className="px-2 pb-2 space-y-2">
                                    {props.photos.map((item) => (
                                        <LibraryItemCard
                                            key={(item as any).id}
                                            item={item as any}
                                            onAdd={props.onAdd}
                                            onDragStart={props.onDragStart}
                                            onRequestDelete={props.onRequestDelete}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- Main component ---------- */

export function LibraryList(props: Readonly<{
    items: Asset[];
    onAdd: (asset: Asset) => void;
    onDragStart: (e: React.DragEvent, asset: Asset) => void;
    onRequestDelete: (asset: Asset) => void;
    viewMode: ViewMode;
}>) {
    const groups = useMemo<YearGroup[]>(() => {
        const yearMap = new Map<string, { yearKey: string; monthMap: Map<string, Asset[]> }>();

        for (const item of props.items) {
            const yearKey = getYearKey((item as any).date);
            const monthKey = getMonthKey((item as any).date);

            if (!yearMap.has(yearKey)) yearMap.set(yearKey, { yearKey, monthMap: new Map() });
            const y = yearMap.get(yearKey)!;
            if (!y.monthMap.has(monthKey)) y.monthMap.set(monthKey, []);
            y.monthMap.get(monthKey)!.push(item);
        }

        const years = Array.from(yearMap.values());
        years.sort((a, b) => sortYearKeysDesc(a.yearKey, b.yearKey));

        const result: YearGroup[] = years.map((y) => {
            const monthKeys = Array.from(y.monthMap.keys());
            monthKeys.sort((a, b) => sortMonthKeysDesc(a, b));

            const months: MonthGroup[] = monthKeys.map((mk) => {
                const items = y.monthMap.get(mk)!.slice().sort(sortAssetsDesc);
                const videos = items.filter((it: any) => it.type === "video");
                const photos = items.filter((it: any) => it.type !== "video");
                return { monthKey: mk, items, photos, videos };
            });

            const allItems = months.flatMap((m) => m.items);
            const videos = allItems.filter((it: any) => it.type === "video");
            const photos = allItems.filter((it: any) => it.type !== "video");

            return { yearKey: y.yearKey, months, videos, photos };
        });

        return result;
    }, [props.items]);

    // cards collapses by year
    const [cardsCollapsed, setCardsCollapsed] = usePersistedState<Record<string, boolean>>(
        "lifee.library.cardsCollapsed",
        {}
    );

    // tree open states (year + month)
    const [treeYearClosed, setTreeYearClosed] = usePersistedState<Record<string, boolean>>(
        "lifee.library.treeYearClosed",
        {}
    );
    const [treeMonthClosed, setTreeMonthClosed] = usePersistedState<Record<string, boolean>>(
        "lifee.library.treeMonthClosed",
        {}
    );

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
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4" data-tour="library">
            <div className="px-3 pb-4">
                {props.viewMode === "tree" ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
                        <div className="p-3">
                            {groups.map((yg) => {
                                const yearClosed = !!treeYearClosed[yg.yearKey];
                                const yearTotal = yg.videos.length + yg.photos.length;

                                return (
                                    <div key={yg.yearKey} className="mb-2 last:mb-0">
                                        <TreeRow
                                            depth={0}
                                            kind="year"
                                            title={yg.yearKey}
                                            subtitle={`${yearTotal} élément${yearTotal > 1 ? "s" : ""}`}
                                            isOpen={!yearClosed}
                                            onToggle={() => setTreeYearClosed((s) => ({ ...s, [yg.yearKey]: !s[yg.yearKey] }))}
                                            right={
                                                <>
                                                    {yg.videos.length > 0 && (
                                                        <CountChip icon={<Video size={14} />} label={String(yg.videos.length)} tone="indigo" />
                                                    )}
                                                    {yg.photos.length > 0 && (
                                                        <CountChip icon={<ImageIcon size={14} />} label={String(yg.photos.length)} tone="rose" />
                                                    )}
                                                </>
                                            }
                                            childrenBlock={
                                                <div className="py-2 space-y-2">
                                                    {yg.months.map((mg) => {
                                                        const monthId = `${yg.yearKey}-${mg.monthKey}`;
                                                        const monthClosed = !!treeMonthClosed[monthId];
                                                        const monthTotal = mg.items.length;

                                                        let monthTitle = mg.monthKey;
                                                        if (mg.monthKey !== "Sans date") {
                                                            const [mm] = mg.monthKey.split("/");
                                                            monthTitle = `${monthNameFR(Number(mm))}`;
                                                        }

                                                        return (
                                                            <div key={monthId}>
                                                                <TreeRow
                                                                    depth={1}
                                                                    kind="month"
                                                                    title={monthTitle}
                                                                    subtitle={
                                                                        mg.monthKey === "Sans date"
                                                                            ? `${monthTotal} élément${monthTotal > 1 ? "s" : ""}`
                                                                            : `${mg.monthKey} • ${monthTotal} élément${monthTotal > 1 ? "s" : ""}`
                                                                    }
                                                                    isOpen={!monthClosed}
                                                                    onToggle={() => setTreeMonthClosed((s) => ({ ...s, [monthId]: !s[monthId] }))}
                                                                    right={
                                                                        <>
                                                                            {mg.videos.length > 0 && (
                                                                                <CountChip icon={<Video size={14} />} label={String(mg.videos.length)} tone="indigo" />
                                                                            )}
                                                                            {mg.photos.length > 0 && (
                                                                                <CountChip icon={<ImageIcon size={14} />} label={String(mg.photos.length)} tone="rose" />
                                                                            )}
                                                                        </>
                                                                    }
                                                                    childrenBlock={
                                                                        <div className="py-1">
                                                                            <div className="space-y-1">
                                                                                {mg.items.map((it) => (
                                                                                    <div key={(it as any).id} className="ml-2">
                                                                                        <TreeItemRow
                                                                                            item={it}
                                                                                            onAdd={props.onAdd}
                                                                                            onDragStart={props.onDragStart}
                                                                                            onRequestDelete={props.onRequestDelete}
                                                                                        />
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    }
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groups.map((g) => {
                            const collapsed = !!cardsCollapsed[g.yearKey];
                            return (
                                <YearCardsSection
                                    key={g.yearKey}
                                    year={g.yearKey}
                                    videos={g.videos}
                                    photos={g.photos}
                                    collapsed={collapsed}
                                    onToggle={() => setCardsCollapsed((s) => ({ ...s, [g.yearKey]: !s[g.yearKey] }))}
                                    onAdd={props.onAdd}
                                    onDragStart={props.onDragStart}
                                    onRequestDelete={props.onRequestDelete}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
