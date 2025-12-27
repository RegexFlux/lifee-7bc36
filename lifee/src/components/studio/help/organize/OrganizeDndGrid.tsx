// src/components/studio/help/organize/OrganizeDnDGrid.tsx
"use client";

import React, {useEffect, useMemo, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {
    Calendar,
    ChevronDown,
    ChevronUp,
    Loader2,
    Pencil,
    Save,
    Trash2,
    X,
} from "lucide-react";
import {fetchJson} from "@/components/landing/interactiveDemo/utils";
import {cx, glassCard, pillBase} from "@/components/studio/help/ui";
import type {AlbumItemDto} from "@/types/studioHelp";
import {AssetThumb} from "@/components/asset/AssetThumb";
import {toast} from "react-hot-toast";
import {useAlbumExportLatest} from "@/hooks/useAlbumExportLatest";

function monthLabelFR(month: number) {
    const d = new Date(Date.UTC(2024, Math.max(0, Math.min(11, month - 1)), 1));
    const s = new Intl.DateTimeFormat("fr-FR", {month: "short"}).format(d);
    return s.replace(".", "").replace(/^./, (c) => c.toUpperCase());
}

function MonthYearPill(props: { month: number; year: number }) {
    return (
        <span
            className={cx(
                "inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5",
                "text-[10px] font-bold text-stone-700"
            )}
            title={`Date: ${String(props.month).padStart(2, "0")}/${props.year}`}
        >
      <Calendar size={12} className="text-stone-500"/>
            {monthLabelFR(props.month)} {props.year}
    </span>
    );
}

type PatchAssetBody = { title?: string; month?: number; year?: number; description?: string };

async function patchAsset(assetId: string, body: PatchAssetBody) {
    return fetchJson<{ asset: any }>(`/api/assets/${encodeURIComponent(assetId)}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
    });
}

async function deleteAlbumItem(albumId: string, itemId: string) {
    return fetchJson(
        `/api/albums/${encodeURIComponent(albumId)}/items/${encodeURIComponent(itemId)}`,
        {method: "DELETE"}
    );
}

async function reorderAlbumItems(albumId: string, orderedItemIds: string[]) {
    return fetchJson(`/api/albums/${encodeURIComponent(albumId)}/items/reorder`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({orderedItemIds}),
    });
}

function prettyType(t: string) {
    return t === "video" ? "VID" : "IMG";
}

/** Bottom sheet */
function EditAssetSheet(props: {
    open: boolean;
    item: AlbumItemDto | null;
    onClose: () => void;
    onSaved: (patch: PatchAssetBody) => void;
    onRemoveFromAlbum: () => void;
}) {
    const item = props.item;
    const [title, setTitle] = useState("");
    const [month, setMonth] = useState<number>(1);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [description, setDescription] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!item) return;
        setTitle(item.asset.title || "");
        setMonth(item.asset.month || 1);
        setYear(item.asset.year || new Date().getFullYear());
        setDescription(item.asset.description || "");
        setErr(null);
    }, [item, props.open]);

    const months = useMemo(() => Array.from({length: 12}, (_, i) => i + 1), []);
    const years = useMemo(() => {
        const now = new Date().getFullYear();
        return Array.from({length: 31}, (_, i) => now - 15 + i);
    }, []);

    const save = async () => {
        if (!item) return;
        setErr(null);
        setSaving(true);
        try {
            const body: PatchAssetBody = {
                title: title.trim() || undefined,
                month,
                year,
                description
            };
            await patchAsset(item.asset.id, body);
            console.log('yoyoyoy', body);
            props.onSaved(body);
            props.onClose();
        } catch (e: any) {
            setErr(e?.message || "Impossible d’enregistrer.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {props.open && item ? (
                <div className="fixed inset-0 z-[120]">
                    <motion.button
                        type="button"
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={props.onClose}
                        aria-label="Fermer"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                    />

                    <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className={cx(
                                "w-full sm:max-w-lg bg-white border border-stone-200 shadow-2xl overflow-hidden",
                                "rounded-t-3xl sm:rounded-3xl max-h-[88vh]"
                            )}
                            initial={{y: 18, opacity: 0, scale: 0.99}}
                            animate={{y: 0, opacity: 1, scale: 1}}
                            exit={{y: 18, opacity: 0, scale: 0.99}}
                            transition={{type: "spring", stiffness: 420, damping: 34}}
                        >
                            <div className="p-4 border-b border-stone-100 bg-gradient-to-b from-stone-50 to-white">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className={pillBase()}>
                                            <Pencil size={14} className="text-amber-600"/>
                                            Éditer le souvenir
                                        </div>
                                        <div className="mt-2 text-sm font-black text-stone-900 truncate">
                                            {item.asset.title || "Sans titre"}
                                        </div>
                                        <div className="mt-1 text-xs text-stone-500">
                                            Ajustez la date pour un album plus clair.
                                        </div>
                                    </div>

                                    <button
                                        onClick={props.onClose}
                                        className="p-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200"
                                        aria-label="Fermer"
                                    >
                                        <X size={18} className="text-stone-600"/>
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 space-y-3 overflow-auto">
                                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                                    <label className="block text-[11px] font-bold text-stone-700">
                                        Titre
                                    </label>
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ex: Vacances à Nice"
                                        className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-white px-3 text-[13px] font-semibold text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-300/60"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-stone-200 bg-white p-3">
                                        <label className="block text-[11px] font-bold text-stone-700">
                                            Mois
                                        </label>
                                        <select
                                            value={month}
                                            onChange={(e) => setMonth(Number(e.target.value))}
                                            className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-white px-3 text-[13px] font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-amber-300/60"
                                        >
                                            {months.map((m) => (
                                                <option key={m} value={m}>
                                                    {monthLabelFR(m)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="rounded-2xl border border-stone-200 bg-white p-3">
                                        <label className="block text-[11px] font-bold text-stone-700">
                                            Année
                                        </label>
                                        <select
                                            value={year}
                                            onChange={(e) => setYear(Number(e.target.value))}
                                            className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-white px-3 text-[13px] font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-amber-300/60"
                                        >
                                            {years.map((y) => (
                                                <option key={y} value={y}>
                                                    {y}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                                    <label className="block text-[11px] font-bold text-stone-700">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Ex: Vacances à Nice"
                                        rows={4}
                                        className="mt-2 py-2 w-full rounded-2xl border border-stone-200 bg-white px-3 text-[13px] font-semibold text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-300/60"
                                    />
                                </div>

                                {err ? (
                                    <div
                                        className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                                        {err}
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={props.onRemoveFromAlbum}
                                        className="h-12 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-900 text-sm font-black transition inline-flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} className="text-stone-700"/>
                                        Retirer
                                    </button>

                                    <button
                                        type="button"
                                        onClick={save}
                                        disabled={saving}
                                        className={cx(
                                            "h-12 rounded-2xl text-sm font-black transition inline-flex items-center justify-center gap-2",
                                            saving
                                                ? "bg-stone-200 text-stone-500"
                                                : "bg-gradient-to-r from-rose-600 to-amber-500 text-white hover:opacity-[0.98] active:scale-[0.99]"
                                        )}
                                    >
                                        {saving ? (
                                            <Loader2 size={16} className="animate-spin"/>
                                        ) : (
                                            <Save size={16}/>
                                        )}
                                        Enregistrer
                                    </button>
                                </div>

                                <div className="text-[11px] text-stone-500">
                                    Retirer de l’album ne supprime pas le fichier de votre bibliothèque.
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}

export function OrganizeDnDGrid(props: {
    albumId: string;
    items: AlbumItemDto[];
    onChangeItems: (items: AlbumItemDto[]) => void;
}) {
    const [savingOrder, setSavingOrder] = useState(false);
    const [savedPulse, setSavedPulse] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editItemId, setEditItemId] = useState<string | null>(null);

    // anti-spam: queue last order
    const inFlightRef = useMemo(() => ({current: false}), []);
    const queuedRef = useMemo(() => ({current: null as string[] | null}), []);
    const lastSentRef = useMemo(() => ({current: ""}), []);

    const editItem = useMemo(
        () => props.items.find((x) => x.id === editItemId) ?? null,
        [props.items, editItemId]
    );

    const persistOrder = async (ids: string[]) => {
        const key = ids.join("|");
        if (!ids.length) return;
        if (key === lastSentRef.current) return;

        if (inFlightRef.current) {
            queuedRef.current = ids;
            return;
        }

        inFlightRef.current = true;
        queuedRef.current = null;
        lastSentRef.current = key;

        setSavingOrder(true);
        try {
            await reorderAlbumItems(props.albumId, ids);
            setSavedPulse(true);
            window.setTimeout(() => setSavedPulse(false), 650);
            return true;
        } catch {
            toast.error("Vous ne pouvez actuellement pas modifier l'ordre")
        } finally {
            setSavingOrder(false);
            inFlightRef.current = false;
            if (queuedRef.current) {
                const next = queuedRef.current;
                queuedRef.current = null;
                await persistOrder(next);
            }
        }
    };

    const move = async (itemId: string, dir: -1 | 1) => {
        const initial = [...props.items];
        try {
            const idx = props.items.findIndex((x) => x.id === itemId);
            if (idx < 0) return;
            const to = idx + dir;
            if (to < 0 || to >= props.items.length) return;

            const next = [...props.items];
            const tmp = next[idx];
            next[idx] = next[to];
            next[to] = tmp;

            const result = await persistOrder(next.map((x) => x.id));
            if (result) {
                props.onChangeItems(next);
            }
        } catch {
            props.onChangeItems(initial);
        }
    };

    const removeFromAlbum = async (itemId: string) => {
        const next = props.items.filter((x) => x.id !== itemId);
        props.onChangeItems(next);

        await deleteAlbumItem(props.albumId, itemId);
        await persistOrder(next.map((x) => x.id));

        if (editItemId === itemId) {
            setEditOpen(false);
            setEditItemId(null);
        }
    };

    const onSavedAsset = (patch: PatchAssetBody) => {
        if (!editItemId) return;
        const next = props.items.map((it) => {
            if (it.id !== editItemId) return it;
            return {
                ...it,
                asset: {
                    ...it.asset,
                    ...(patch.title !== undefined ? {title: patch.title} : {}),
                    ...(patch.month !== undefined ? {month: patch.month} : {}),
                    ...(patch.year !== undefined ? {year: patch.year} : {}),
                    ...(patch.description !== undefined ? {description: patch.description} : {}),
                },
            };
        });
        props.onChangeItems(next);
    };

    const exportState = useAlbumExportLatest(props.albumId);

    return (
        <>
            <EditAssetSheet
                open={editOpen}
                item={editItem}
                onClose={() => setEditOpen(false)}
                onSaved={onSavedAsset}
                onRemoveFromAlbum={() => {
                    if (!editItem) return;
                    void removeFromAlbum(editItem.id);
                }}
            />
            <div className={cx(glassCard())} data-tour="timeline">
                <div className="p-4 sm:p-5 border-b border-stone-100 bg-gradient-to-b from-stone-50 to-white">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className={pillBase()}>
                                <ChevronUp size={14} className="text-stone-700"/>
                                Organisation
                            </div>
                            <div className="mt-2 text-sm font-black text-stone-900">
                                Réordonnez avec les flèches (simple et fiable)
                            </div>
                            {exportState.isRunning && (
                                <div className="mt-1 text-xs text-red-500">
                                    Vous ne pouvez pas modifier l&#39;ordre des éléments durant l&#39;export
                                </div>)
                            }
                        </div>

                        <div className="shrink-0 text-[11px] font-semibold">
                            {savingOrder ? (
                                <span className="text-stone-500 inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin"/> Sauvegarde…
              </span>
                            ) : (
                                <span className={cx("transition", savedPulse ? "text-emerald-700" : "text-stone-500")}>
                {props.items.length ? "Sauvegardé" : ""}
              </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-5">
                    {props.items.length === 0 ? (
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 text-xs text-stone-600">
                            Album vide : ajoutez des fichiers, puis revenez ici pour les trier.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {props.items.map((it, index) => {
                                const canUp = index > 0;
                                const canDown = index < props.items.length - 1;

                                return (
                                    <div
                                        key={it.id}
                                        className={cx(
                                            "rounded-3xl border border-stone-200 bg-white/90 backdrop-blur",
                                            "shadow-[0_1px_0_rgba(0,0,0,0.03)] overflow-hidden"
                                        )}
                                    >
                                        <div className="flex flex-col md:flex-row items-stretch">
                                            <div
                                                className="w-full md:w-96 shrink-0 bg-stone-100 relative overflow-hidden my-auto">
                                                <AssetThumb type={it.asset.type} assetId={it.asset.id}/>

                                                <div className="absolute left-2 top-2">
    <span
        className="inline-flex items-center rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10px] font-black text-stone-600">
      {it.asset.type === "video" ? "VID" : "IMG"}
    </span>
                                                </div>
                                            </div>
                                            <div
                                                className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col justify-between gap-2">
                                                <div
                                                    className="flex md:flex-col md:justify-between md:h-full items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div
                                                            className="text-[13px] sm:text-[14px] font-black text-stone-900 truncate">
                                                            {it.asset.title || "Sans titre"}
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                                                            <MonthYearPill month={it.asset.month} year={it.asset.year}/>
                                                            <span
                                                                className="text-[11px] text-stone-500">#{index + 1}</span>
                                                        </div>
                                                        {it.asset.description && (
                                                            <div
                                                                className="text-[11px] text-stone-500 wrap-break-word pt-2">
                                                                {it.asset.description}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!exportState.isRunning && (
                                                        <div className="shrink-0 flex items-center gap-2">
                                                            {/* Move up/down */}
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={!canUp}
                                                                    onClick={() => void move(it.id, -1)}
                                                                    className={cx(
                                                                        "h-10 w-10 rounded-2xl border grid place-items-center transition active:scale-[0.99]",
                                                                        canUp
                                                                            ? "border-stone-200 bg-white hover:bg-stone-50"
                                                                            : "border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed"
                                                                    )}
                                                                    aria-label="Monter"
                                                                    title="Monter"
                                                                >
                                                                    <ChevronUp size={16} className="text-stone-700"/>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={!canDown}
                                                                    onClick={() => void move(it.id, +1)}
                                                                    className={cx(
                                                                        "h-10 w-10 rounded-2xl border grid place-items-center transition active:scale-[0.99]",
                                                                        canDown
                                                                            ? "border-stone-200 bg-white hover:bg-stone-50"
                                                                            : "border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed"
                                                                    )}
                                                                    aria-label="Descendre"
                                                                    title="Descendre"
                                                                >
                                                                    <ChevronDown size={16} className="text-stone-700"/>
                                                                </button>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditItemId(it.id);
                                                                    setEditOpen(true);
                                                                }}
                                                                className="h-10 w-10 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 grid place-items-center transition active:scale-[0.99]"
                                                                aria-label="Éditer"
                                                                title="Éditer"
                                                            >
                                                                <Pencil size={16} className="text-stone-700"/>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => void removeFromAlbum(it.id)}
                                                                className="h-10 w-10 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 grid place-items-center transition active:scale-[0.99]"
                                                                aria-label="Retirer de l’album"
                                                                title="Retirer de l’album"
                                                            >
                                                                <Trash2 size={16} className="text-stone-700"/>
                                                            </button>
                                                        </div>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
