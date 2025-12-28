// src/components/studio/organize/AlbumOrganizeScreen.tsx
"use client";

import React, {useEffect, useMemo, useState} from "react";
import {fetchJson} from "@/lib/http";
import {GripVertical, Save, Loader2, Pencil} from "lucide-react";
import {AssetEditModal} from "@/components/studio/organize/AssetEditModal";
import {useT} from "@/lib/i18n/useT";
import {AlbumItemDto} from "@/types/studioHelp";

type AlbumResp = { album: { id: string; title: string; mode: "studio_help" | "studio_pro" } };

export function AlbumOrganizeScreen({albumId}: { albumId: string }) {
    const {t} = useT();
    const [album, setAlbum] = useState<AlbumResp["album"] | null>(null);
    const [items, setItems] = useState<AlbumItemDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editAssetId, setEditAssetId] = useState<string | null>(null);

    const orderedIds = useMemo(() => items.map((it) => it.id), [items]);

    const load = async () => {
        setLoading(true);
        try {
            const a = await fetchJson<AlbumResp>(`/api/albums/${encodeURIComponent(albumId)}`);
            const it = await fetchJson<{ items: AlbumItemDto[] }>(`/api/albums/${encodeURIComponent(albumId)}/items`);
            setAlbum(a.album);
            setItems(it.items);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [albumId]);

    const saveOrder = async () => {
        setSaving(true);
        try {
            await fetchJson(`/api/albums/${encodeURIComponent(albumId)}/items/reorder`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({orderedItemIds: orderedIds}),
            });
        } finally {
            setSaving(false);
        }
    };

    // (simple) move up/down helpers (tu peux remplacer par dnd plus tard)
    const move = (id: string, dir: -1 | 1) => {
        setItems((prev) => {
            const idx = prev.findIndex((x) => x.id === id);
            if (idx < 0) return prev;
            const j = idx + dir;
            if (j < 0 || j >= prev.length) return prev;
            const next = [...prev];
            const tmp = next[idx];
            next[idx] = next[j];
            next[j] = tmp;
            return next.map((x, k) => ({...x, position: k + 1}));
        });
    };

    if (loading) {
        return (
            <div
                className="rounded-3xl border border-stone-200 bg-white/70 backdrop-blur shadow-sm p-8 flex items-center gap-3">
                <Loader2 className="animate-spin"/>
                <div className="text-sm font-semibold text-stone-700">{t("studio.organize.loading")}</div>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-3xl border border-stone-200 bg-white/70 backdrop-blur shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="text-xs text-stone-500">{t("studio.organize.titleLabel")}</div>
                        <div className="mt-1 text-xl font-serif text-stone-900">{album?.title ?? "Album"}</div>
                        <div className="mt-2 text-sm text-stone-600">
                            {t("studio.organize.subtitle")}
                        </div>
                    </div>

                    <button
                        data-tour="album-save-order"
                        onClick={saveOrder}
                        disabled={saving}
                        className="px-4 py-2 rounded-2xl bg-stone-900 text-white text-sm font-black hover:bg-stone-800 transition inline-flex items-center gap-2 disabled:opacity-60"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                        {t("studio.organize.saveOrder")}
                    </button>
                </div>

                <div className="mt-5 space-y-2" data-tour="album-reorder">
                    {items.map((it, idx) => (
                        <div key={it.id}
                             className="rounded-2xl border border-stone-200 bg-white p-3 flex items-center gap-3">
                            <div
                                className="grid h-9 w-9 place-items-center rounded-2xl border border-stone-200 bg-stone-50 text-stone-700">
                                <GripVertical size={16}/>
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-black text-stone-900 truncate">
                                    {it.asset?.title || it.asset?.fileKey?.split("/")?.at(-1) || `Item ${idx + 1}`}
                                </div>
                                <div className="mt-0.5 text-xs text-stone-500">
                                    {it.asset?.type} • {it.asset?.month}/{it.asset?.year}
                                </div>
                            </div>

                            <button
                                data-tour="album-edit-item"
                                onClick={() => setEditAssetId(it.asset.id)}
                                className="h-9 px-3 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-black inline-flex items-center gap-2"
                            >
                                <Pencil size={16} className="text-rose-600"/>
                                {t("studio.organize.edit")}
                            </button>

                            <div className="flex gap-2">
                                <button
                                    className="h-9 px-3 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-black"
                                    onClick={() => move(it.id, -1)}>↑
                                </button>
                                <button
                                    className="h-9 px-3 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-black"
                                    onClick={() => move(it.id, +1)}>↓
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <AssetEditModal
                assetId={editAssetId}
                open={!!editAssetId}
                onClose={() => setEditAssetId(null)}
                onSaved={load}
            />
        </>
    );
}
