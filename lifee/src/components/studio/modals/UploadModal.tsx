"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Upload, X, Image as ImageIcon, Video, Clock, Sparkles } from "lucide-react";
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
    thumbnailUrl?: string;
    fileUrl?: string;
};

function getBaseName(filename: string) {
    const base = filename.split(".").slice(0, -1).join(".") || filename;
    return base.trim();
}

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
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // ✅ reset à chaque ouverture (et évite state "stale")
    useEffect(() => {
        if (props.open) {
            setDraft(initial);
            setError(null);
            setDragOver(false);
        }
    }, [props.open, initial]);

    // ✅ object URL preview
    useEffect(() => {
        if (!draft.file) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(draft.file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [draft.file]);

    const setFile = (file: File) => {
        setError(null);

        const type: AssetType = file.type.startsWith("video") ? "video" : "image";
        const name = getBaseName(file.name);

        setDraft((d) => ({
            ...d,
            file,
            type,
            title: d.title || name,
        }));
    };

    const canSubmit = draft.title.trim().length > 0 && !!draft.file;

    const submit = () => {
        setError(null);

        if (!draft.file) {
            setError("Ajoutez un fichier (photo ou vidéo).");
            return;
        }
        if (!draft.title.trim()) {
            setError("Ajoutez un titre.");
            return;
        }
        if (draft.type === "video" && !draft.duration.trim()) {
            setError("Ajoutez une durée (ex: 5s).");
            return;
        }

        props.onSubmit(draft);
    };

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={props.onClose} />

            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative px-6 py-5 border-b border-stone-200 bg-gradient-to-b from-stone-50 to-white">
                    <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-rose-200/35 blur-3xl" />
                    <div className="absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-amber-200/35 blur-3xl" />

                    <div className="relative flex items-start justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs font-bold text-stone-700 shadow-sm backdrop-blur">
                                <Upload size={14} className="text-rose-600" />
                                Importer un souvenir
                            </div>
                            <h3 className="mt-3 text-xl font-serif text-stone-900">Ajouter un média</h3>
                            <p className="mt-1 text-sm text-stone-500">
                                Photo → générable en vidéo • Vidéo → ajout direct à votre bibliothèque
                            </p>
                        </div>

                        <button onClick={props.onClose} aria-label="Fermer" className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {error}
                        </div>
                    )}

                    {/* Type switch (optionnel, auto aussi) */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setDraft((d) => ({ ...d, type: "image" }))}
                            className={[
                                "rounded-2xl border px-4 py-3 text-left transition-all",
                                draft.type === "image"
                                    ? "border-rose-200 bg-rose-50 shadow-sm"
                                    : "border-stone-200 bg-white hover:bg-stone-50",
                            ].join(" ")}
                        >
                            <div className="flex items-center gap-2">
                                <div className="h-9 w-9 rounded-xl bg-white border border-stone-200 grid place-items-center text-rose-600">
                                    <ImageIcon size={18} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-stone-900">Photo</div>
                                    <div className="text-xs text-stone-500">Générable en vidéo</div>
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setDraft((d) => ({ ...d, type: "video" }))}
                            className={[
                                "rounded-2xl border px-4 py-3 text-left transition-all",
                                draft.type === "video"
                                    ? "border-indigo-200 bg-indigo-50 shadow-sm"
                                    : "border-stone-200 bg-white hover:bg-stone-50",
                            ].join(" ")}
                        >
                            <div className="flex items-center gap-2">
                                <div className="h-9 w-9 rounded-xl bg-white border border-stone-200 grid place-items-center text-indigo-600">
                                    <Video size={18} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-stone-900">Vidéo</div>
                                    <div className="text-xs text-stone-500">Ajout direct</div>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Dropzone */}
                    <div
                        className={[
                            "relative rounded-3xl border-2 border-dashed p-4 transition-colors",
                            dragOver ? "border-rose-300 bg-rose-50" : "border-stone-200 bg-stone-50/50 hover:bg-stone-50",
                        ].join(" ")}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOver(true);
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOver(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOver(false);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOver(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) setFile(file);
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setFile(file);
                            }}
                        />

                        {/* Preview */}
                        {draft.file ? (
                            <div className="flex items-center gap-4">
                                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                                    {previewUrl && draft.type === "image" ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" draggable={false} />
                                    ) : (
                                        <div className="h-full w-full grid place-items-center text-stone-500">
                                            {draft.type === "video" ? <Video size={18} /> : <ImageIcon size={18} />}
                                        </div>
                                    )}

                                    <div className="absolute bottom-1 left-1 rounded-full border border-white/60 bg-black/30 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                                        {draft.type === "video" ? "Vidéo" : "Photo"}
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Check className="text-green-600" size={16} />
                                        <p className="text-sm font-semibold text-stone-800 truncate">{draft.file.name}</p>
                                    </div>
                                    <p className="mt-1 text-xs text-stone-500">
                                        Glissez/déposez pour remplacer • ou cliquez pour changer
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDraft((d) => ({ ...d, file: null }));
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-stone-200 text-stone-400 hover:text-stone-700 transition-colors"
                                    title="Retirer"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="py-6 text-center">
                                <div className="mx-auto h-12 w-12 rounded-2xl border border-stone-200 bg-white grid place-items-center text-rose-600 shadow-sm">
                                    <Upload size={20} />
                                </div>
                                <p className="mt-3 text-sm font-semibold text-stone-800">
                                    Déposez une photo ou une vidéo
                                </p>
                                <p className="mt-1 text-xs text-stone-500">
                                    ou cliquez pour sélectionner un fichier
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Titre</label>
                        <input
                            type="text"
                            placeholder="Titre du souvenir"
                            value={draft.title}
                            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                        />
                    </div>

                    {/* Date */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Mois</label>
                            <select
                                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                value={draft.month}
                                onChange={(e) => setDraft((d) => ({ ...d, month: parseInt(e.target.value, 10) }))}
                            >
                                {MONTHS.map((m, i) => (
                                    <option key={m} value={i}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Année</label>
                            <select
                                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
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
                    </div>

                    {/* Video duration */}
                    {draft.type === "video" && (
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Durée</label>
                            <div className="relative">
                                <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="text"
                                    placeholder="ex: 5s"
                                    value={draft.duration}
                                    onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
                                    className="w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                />
                            </div>
                            <p className="mt-1 text-[11px] text-stone-500">
                                Astuce : si tu ne connais pas la durée exacte, mets une valeur approximative (ex: 10s).
                            </p>
                        </div>
                    )}

                    {/* CTA */}
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!canSubmit}
                        className={[
                            "w-full rounded-2xl py-3.5 font-bold transition-all flex items-center justify-center gap-2",
                            canSubmit
                                ? "bg-stone-900 text-white hover:bg-stone-800 shadow-lg"
                                : "bg-stone-200 text-stone-500 cursor-not-allowed",
                        ].join(" ")}
                    >
                        {draft.type === "image" ? <Sparkles size={18} /> : <Upload size={18} />}
                        {draft.type === "image" ? "Ajouter la photo" : "Ajouter la vidéo"}
                    </button>

                    <p className="text-center text-[11px] text-stone-400">
                        Vos médias restent privés. Vous pourrez les supprimer à tout moment.
                    </p>
                </div>
            </div>
        </div>
    );
}
