"use client";

import React, { useMemo, useState } from "react";
import { Check, Upload, X } from "lucide-react";
import type { AssetType } from "@/types/studio";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);

export type UploadDraft = {
    title: string;
    type: AssetType;
    month: number; // 0..11
    year: number;
    duration: string; // pour video
    file: File | null;
    // optionnel si ton back gère direct une URL
    thumbnailUrl?: string;
    fileUrl?: string;
};

export function UploadModal(props: {
    open: boolean;
    initial?: Partial<UploadDraft>;
    onClose: () => void;
    onSubmit: (draft: UploadDraft) => void;
}) {
    const initial = useMemo<UploadDraft>(() => {
        const now = new Date();
        return {
            title: "",
            type: "image",
            month: now.getMonth(),
            year: now.getFullYear(),
            duration: "5s",
            file: null,
            ...props.initial,
        };
    }, [props.initial]);

    const [draft, setDraft] = useState<UploadDraft>(initial);

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Upload size={18} className="text-indigo-600" /> Média
                    </h3>
                    <button onClick={props.onClose} aria-label="Fermer">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <input
                        type="text"
                        className="w-full border rounded-lg p-2 text-sm"
                        placeholder="Titre du souvenir"
                        value={draft.title}
                        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    />

                    <div className="relative group border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-gray-50">
                        <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                if (!file) return;
                                const type: AssetType = file.type.startsWith("video") ? "video" : "image";
                                const baseName = file.name.split(".").slice(0, -1).join(".") || file.name;
                                setDraft((d) => ({
                                    ...d,
                                    file,
                                    type,
                                    title: d.title || baseName,
                                }));
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />

                        {draft.file ? (
                            <div className="text-center">
                                <Check className="mx-auto text-green-500 mb-1" />
                                <p className="text-xs text-slate-600 truncate max-w-[200px]">
                                    {draft.file.name}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400">
                                <Upload className="mx-auto mb-1" />
                                <p className="text-xs">Toucher pour uploader</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select
                            className="border rounded-lg p-2 text-sm bg-white"
                            value={draft.month}
                            onChange={(e) => setDraft((d) => ({ ...d, month: parseInt(e.target.value, 10) }))}
                        >
                            {MONTHS.map((m, i) => (
                                <option key={m} value={i}>
                                    {m}
                                </option>
                            ))}
                        </select>

                        <select
                            className="border rounded-lg p-2 text-sm bg-white"
                            value={draft.year}
                            onChange={(e) => setDraft((d) => ({ ...d, year: parseInt(e.target.value, 10) }))}
                        >
                            {YEARS.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    {draft.type === "video" && (
                        <input
                            type="text"
                            className="w-full border rounded-lg p-2 text-sm"
                            placeholder="Durée (ex: 5s)"
                            value={draft.duration}
                            onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
                        />
                    )}

                    <button
                        onClick={() => props.onSubmit(draft)}
                        disabled={!draft.title}
                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
                    >
                        Ajouter
                    </button>
                </div>
            </div>
        </div>
    );
}
