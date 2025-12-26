// src/components/studio/organize/AssetEditModal.tsx
"use client";

import React, {useEffect, useState} from "react";
import {X, Loader2, Save} from "lucide-react";
import {fetchJson} from "@/lib/http";
import {useT} from "@/lib/i18n/useT";

type GetResp = { asset: { id: string; title: string | null; month: number; year: number } };

export function AssetEditModal(props: {
    assetId: string | null;
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const {t} = useT();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState("");
    const [month, setMonth] = useState(1);
    const [year, setYear] = useState(2025);

    useEffect(() => {
        if (!props.open || !props.assetId) return;
        setLoading(true);
        (async () => {
            try {
                const r = await fetchJson<GetResp>(`/api/assets/${encodeURIComponent(props.assetId!)}`);
                setTitle(r.asset.title ?? "");
                setMonth(r.asset.month);
                setYear(r.asset.year);
            } finally {
                setLoading(false);
            }
        })();
    }, [props.open, props.assetId]);

    const save = async () => {
        if (!props.assetId) return;
        setSaving(true);
        try {
            await fetchJson(`/api/assets/${encodeURIComponent(props.assetId)}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({title: title || undefined, month, year}),
            });
            props.onSaved();
            props.onClose();
        } finally {
            setSaving(false);
        }
    };

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
            <button className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={props.onClose}
                    aria-label="Close"/>
            <div
                className="relative w-full max-w-md rounded-3xl border border-stone-200 bg-white shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
                    <div className="text-sm font-black text-stone-900">{t("studio.asset.editTitle")}</div>
                    <button onClick={props.onClose}
                            className="h-9 w-9 rounded-2xl border border-stone-200 bg-white hover:bg-stone-100 grid place-items-center">
                        <X size={18} className="text-stone-700"/>
                    </button>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                            <Loader2 className="animate-spin"/> {t("studio.asset.loading")}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label
                                    className="block text-xs font-black text-stone-500 uppercase mb-1">{t("studio.asset.title")}</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-rose-200"
                                    placeholder={t("studio.asset.titlePlaceholder")}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label
                                        className="block text-xs font-black text-stone-500 uppercase mb-1">{t("studio.asset.month")}</label>
                                    <input
                                        type="number" min={1} max={12}
                                        value={month}
                                        onChange={(e) => setMonth(Number(e.target.value))}
                                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-900 outline-none"
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-xs font-black text-stone-500 uppercase mb-1">{t("studio.asset.year")}</label>
                                    <input
                                        type="number" min={1900} max={2100}
                                        value={year}
                                        onChange={(e) => setYear(Number(e.target.value))}
                                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-900 outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={save}
                                disabled={saving}
                                className="w-full px-4 py-3 rounded-2xl bg-stone-900 text-white text-sm font-black hover:bg-stone-800 transition flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                {t("studio.asset.save")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
