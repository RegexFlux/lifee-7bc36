import React, { useMemo } from "react";
import {
    GripHorizontal,
    Image as ImageIcon,
    Trash2,
    Video,
    Play,
    Wand2,
    Loader2,
    CheckCircle2,
    XCircle,
    Sparkles,
} from "lucide-react";
import type { Asset } from "@/types/studio";

type JobStatus = "failed" | "starting" | "processing" | "succeeded" | undefined | null;

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

/**
 * Accepte progress:
 * - 0..1
 * - 0..100
 * - string convertible
 */
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

function formatMeta(item: Asset) {
    const parts: string[] = [];
    if (item.date) parts.push(item.date);
    if (item.type === "video" && (item as any).duration) parts.push(item.duration);
    return parts.join(" • ");
}

function getStatusUI(status: JobStatus) {
    switch (status) {
        case "starting":
            return {
                label: "Préparation",
                hint: "Mise en place…",
                tone: "amber" as const,
                pill: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
                rail: "from-amber-200/70 via-amber-300/30 to-transparent",
                Icon: Loader2,
                spin: true,
            };
        case "processing":
            return {
                label: "Restitution",
                hint: "En cours…",
                tone: "amber" as const,
                pill: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
                rail: "from-amber-200/70 via-rose-200/30 to-transparent",
                Icon: Sparkles,
                spin: false,
            };
        case "succeeded":
            return {
                label: "Restitué",
                hint: "Prêt",
                tone: "emerald" as const,
                pill: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
                rail: "from-emerald-200/70 via-emerald-300/25 to-transparent",
                Icon: CheckCircle2,
                spin: false,
            };
        case "failed":
            return {
                label: "Échec",
                hint: "Réessayer",
                tone: "rose" as const,
                pill: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
                rail: "from-rose-200/80 via-rose-300/25 to-transparent",
                Icon: XCircle,
                spin: false,
            };
        default:
            return null;
    }
}

function StatusPill(props: { status: JobStatus; progressPct: number | null; subtle?: boolean }) {
    const ui = getStatusUI(props.status);
    if (!ui) return null;

    const { Icon } = ui;
    const right = props.progressPct !== null && props.status === "processing" ? ` · ${props.progressPct}%` : "";

    return (
        <span
            className={cx(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                ui.pill,
                props.subtle && "opacity-85"
            )}
            title={ui.hint}
        >
      <Icon className={cx("h-3.5 w-3.5", ui.spin && "animate-spin motion-reduce:animate-none")} />
            {ui.label}
            {right}
    </span>
    );
}

/**
 * Thumb "intelligent" :
 * - starting/processing => vignette premium + progress
 * - failed => vignette rouge + icône
 * - succeeded => thumbnail si dispo sinon fallback
 */
function Thumb(props: {
    item: Asset;
    status: JobStatus;
    progressPct: number | null;
    isVideo: boolean;
}) {
    const { item, status, progressPct, isVideo } = props;

    const ui = getStatusUI(status);

    if (status === "starting" || status === "processing") {
        const indeterminate = progressPct === null;
        return (
            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-white/60">
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(80px 60px at 25% 20%, rgba(245,158,11,0.22), transparent 60%), radial-gradient(80px 60px at 85% 85%, rgba(244,63,94,0.10), transparent 60%), linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.02))",
                    }}
                    aria-hidden="true"
                />
                {indeterminate ? (
                    <div
                        className={cx(
                            "absolute -inset-x-10 -top-6 h-10 rotate-12",
                            "bg-gradient-to-r from-transparent via-white/40 to-transparent",
                            "animate-[shimmer_1.6s_ease-in-out_infinite] motion-reduce:animate-none"
                        )}
                        aria-hidden="true"
                    />
                ) : null}

                <div className="relative grid h-full w-full place-items-center">
                    <div className="flex flex-col items-center gap-1">
                        <div className="grid place-items-center rounded-full border border-white/50 bg-white/70 p-1.5 backdrop-blur">
                            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none text-amber-700" />
                        </div>

                        <div className="text-[9px] font-semibold text-slate-700 leading-none">
                            {status === "starting" ? "Préparation" : "Restitution"}
                        </div>

                        <div className="h-1.5 w-9 overflow-hidden rounded-full bg-white/60 ring-1 ring-slate-200">
                            {indeterminate ? (
                                <div
                                    className={cx(
                                        "h-full w-1/2 rounded-full bg-slate-900/20",
                                        "animate-[progress_1.2s_ease-in-out_infinite] motion-reduce:animate-none"
                                    )}
                                />
                            ) : (
                                <div className="h-full rounded-full bg-slate-900/20" style={{ width: `${progressPct}%` }} />
                            )}
                        </div>
                    </div>
                </div>

                <style jsx>{`
          @keyframes shimmer {
            0% {
              transform: translateX(-60%) rotate(12deg);
              opacity: 0.15;
            }
            50% {
              opacity: 0.35;
            }
            100% {
              transform: translateX(60%) rotate(12deg);
              opacity: 0.15;
            }
          }
          @keyframes progress {
            0% {
              transform: translateX(-70%);
              opacity: 0.35;
            }
            50% {
              opacity: 0.7;
            }
            100% {
              transform: translateX(170%);
              opacity: 0.35;
            }
          }
        `}</style>
            </div>
        );
    }

    if (status === "failed") {
        return (
            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-rose-200 bg-rose-50">
                <div className="absolute inset-0 opacity-70" aria-hidden="true"
                     style={{
                         background:
                             "radial-gradient(70px 50px at 30% 25%, rgba(244,63,94,0.22), transparent 60%), radial-gradient(70px 50px at 80% 85%, rgba(244,63,94,0.12), transparent 60%)",
                     }}
                />
                <div className="relative grid h-full w-full place-items-center text-rose-700">
                    <XCircle className="h-5 w-5" />
                </div>
            </div>
        );
    }

    // succeeded OR no status => normal thumbnail fallback
    const thumbUrl = (item as any).thumbnailUrl as string | undefined;
    return (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={thumbUrl}
                    alt={(item as any).title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                    draggable={false}
                />
            ) : (
                <div className="grid h-full w-full place-items-center text-slate-400">
                    {isVideo ? <Video size={18} /> : <ImageIcon size={18} />}
                </div>
            )}

            {/* Overlay play si vidéo (uniquement si pas en erreur / pas en cours) */}
            {isVideo && status !== "starting" && status !== "processing" && (
                <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="rounded-full border border-white/40 bg-black/35 p-1.5 text-white backdrop-blur">
                        <Play size={14} className="fill-white" />
                    </div>
                </div>
            )}

            {ui?.tone === "emerald" ? (
                <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
            ) : null}
        </div>
    );
}

export function LibraryItemCard(props: Readonly<{
    item: Asset & {
        isGenerated?: boolean;
        lastJobStatus?: JobStatus; // "failed" | "starting" | "processing" | "succeeded"
        progress?: number | string | null;
    };
    onAdd: (asset: Asset) => void;
    onDragStart: (e: React.DragEvent, asset: Asset) => void;
    onRequestDelete: (asset: Asset) => void;
}>) {
    const { item } = props;

    const meta = useMemo(() => formatMeta(item), [item]);
    const isVideo = item.type === "video";
    const isPhoto = item.type === "image";

    const status = item.lastJobStatus as JobStatus;
    const progress01 = normalizeProgress(item.progress);
    const progressPct = progress01 === null ? null : Math.round(progress01 * 100);

    const canDrag = isVideo && (!item.isGenerated || status === "succeeded");
    const isBusy = status === "starting" || status === "processing";

    const ui = getStatusUI(status);

    // UX: click désactivé si job en cours (évite “double trigger”)
    const isClickable = item.type === "image" ? !isBusy : canDrag && !isBusy;

    const ariaLabel = isBusy
        ? `Génération en cours pour ${(item as any).title}${progressPct !== null ? ` : ${progressPct}%` : ""}`
        : isPhoto
            ? `Générer une vidéo depuis ${(item as any).title}`
            : `Ajouter ${(item as any).title} à la timeline`;

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!isClickable) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            props.onAdd(item);
        }
    };

    const onClick = () => {
        if (!isClickable) return;
        console.log('clicked', item.lastJobStatus);
        props.onAdd(item);
    };

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            aria-disabled={!isClickable ? true : undefined}
            onKeyDown={onKeyDown}
            onClick={onClick}
            data-status={status ?? "none"}
            className={cx(
                "group relative w-full rounded-2xl border bg-white/90 backdrop-blur",
                "shadow-[0_14px_45px_-35px_rgba(2,6,23,0.35)]",
                "transition-all duration-200",
                isClickable
                    ? "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_60px_-40px_rgba(2,6,23,0.45)] active:translate-y-0 active:scale-[0.99] cursor-pointer"
                    : "border-slate-200 opacity-[0.94] cursor-default",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
            )}
        >
            {/* Rail de statut (organisation visuelle: “state first”) */}
            <div
                className={cx(
                    "pointer-events-none absolute inset-y-0 left-0 w-[10px] rounded-l-2xl opacity-70",
                    ui ? `bg-gradient-to-b ${ui.rail}` : "bg-gradient-to-b from-slate-200/50 to-transparent"
                )}
                aria-hidden="true"
            />

            {/* Glow */}
            <div
                className={cx(
                    "pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200",
                    isClickable ? "opacity-0 group-hover:opacity-100" : "opacity-60"
                )}
                style={{
                    background:
                        "radial-gradient(1200px 220px at 10% 0%, rgba(244,63,94,0.10), transparent 55%), radial-gradient(900px 220px at 90% 100%, rgba(245,158,11,0.08), transparent 55%)",
                }}
                aria-hidden="true"
            />

            {/* Layout: 3 blocs nets */}
            <div className="relative grid grid-cols-[48px_1fr_auto] items-center gap-3 p-3">
                {/* (A) Thumb */}
                <Thumb item={item} status={status} progressPct={progressPct} isVideo={isVideo} />

                {/* (B) Contenu */}
                <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-slate-800">
                                {(item as any).title}
                            </h4>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                    className={cx(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        isVideo
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                    )}
                >
                  {isVideo ? <Video size={14} /> : <ImageIcon size={14} />}
                    {isVideo ? "Vidéo" : "Photo"}
                </span>

                                {meta ? (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    {meta}
                  </span>
                                ) : null}

                                {/* ✅ Status subtil si non-draggable (ta demande) */}
                                {!canDrag && status ? (
                                    <StatusPill status={status} progressPct={progressPct} subtle />
                                ) : null}

                                {/* ✅ Si pas de status mais non généré, hint ultra discret */}
                                {!canDrag && !status && !(item as any).isGenerated ? (
                                    <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                    Non généré
                  </span>
                                ) : null}
                            </div>

                            {/* micro progress ligne (subtil) */}
                            {(status === "processing" || status === "starting") && (
                                <div className="mt-2 h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                                    {progressPct === null ? (
                                        <div
                                            className={cx(
                                                "h-full w-1/3 rounded-full bg-slate-900/15",
                                                "animate-[progress_1.2s_ease-in-out_infinite] motion-reduce:animate-none"
                                            )}
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <div
                                            className="h-full rounded-full bg-slate-900/15"
                                            style={{ width: `${progressPct}%` }}
                                            role="progressbar"
                                            aria-label="Progression de génération"
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={progressPct}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* CTA dédié photo (propre, jamais absolute) */}
                        {isPhoto && !isBusy && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    props.onAdd(item);
                                }}
                                className={cx(
                                    "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold",
                                    status === "failed"
                                        ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300"
                                        : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300",
                                    "transition-colors shadow-sm",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                                )}
                                aria-label={
                                    status === "failed"
                                        ? `Réessayer la génération depuis ${(item as any).title}`
                                        : `Générer une vidéo depuis ${(item as any).title}`
                                }
                                title={status === "failed" ? "Réessayer" : "Générer une vidéo"}
                            >
                                <Wand2 size={14} />
                                {status === "failed" ? "Réessayer" : "Générer"}
                            </button>
                        )}
                    </div>

                    <div className="mt-1 hidden md:block text-[11px] text-slate-400">
                        {isBusy
                            ? "Restitution en cours…"
                            : canDrag
                                ? "Glissez pour ajouter à la timeline"
                                : status === "failed"
                                    ? "Échec — réessayez ou supprimez"
                                    : "Statut disponible • Drag après restitution"}
                    </div>
                </div>

                {/* (C) Actions (delete + drag si autorisé) */}
                <div className="flex items-center gap-1.5 justify-end">
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
                        aria-label={`Supprimer ${(item as any).title}`}
                    >
                        <Trash2 size={16} />
                    </button>

                    {/* Drag handle (uniquement si canDrag === true) */}
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
                                "cursor-grab active:cursor-grabbing",
                                "transition-colors"
                            )}
                            title="Glisser"
                            aria-label={`Glisser ${(item as any).title}`}
                            role="button"
                            tabIndex={-1}
                        >
                            <GripHorizontal size={16} />
                        </div>
                    ) : (
                        // placeholder alignement + “status subtil” déjà affiché côté contenu
                        <></>
                    )}
                </div>
            </div>

            <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-70%);
            opacity: 0.35;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            transform: translateX(170%);
            opacity: 0.35;
          }
        }
      `}</style>
        </div>
    );
}
