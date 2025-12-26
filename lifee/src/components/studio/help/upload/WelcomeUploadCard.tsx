// src/components/studio/help/upload/WelcomeUploadCard.tsx
"use client";

import React, {useMemo, useRef, useState} from "react";
import {Loader2, Trash2, Upload, ShieldCheck, Sparkles, Film} from "lucide-react";
import {uploadFilesToAssetsAndAttachToAlbum} from "./uploadUtils";
import {cx, glassCard, pillBase} from "@/components/studio/help/ui";
import {useT} from "@/lib/i18n/useT";

type QItem = { id: string; file: File; previewUrl: string };

function makeId() {
    return crypto.randomUUID?.() ?? String(Date.now() + Math.random());
}

function isImage(f: File) {
    return (f.type || "").startsWith("image/");
}

export function WelcomeUploadCard(props: { albumId: string; onUploaded?: () => void }) {
    const {t} = useT();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [queue, setQueue] = useState<QItem[]>([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const canUpload = queue.length > 0 && !busy;

    const addFiles = (files: File[]) => {
        const next = files.map((f) => ({id: makeId(), file: f, previewUrl: URL.createObjectURL(f)}));
        setQueue((prev) => [...prev, ...next]);
    };

    const remove = (id: string) => {
        setQueue((prev) => {
            const it = prev.find((x) => x.id === id);
            if (it) {
                try {
                    URL.revokeObjectURL(it.previewUrl);
                } catch {
                }
            }
            return prev.filter((x) => x.id !== id);
        });
    };

    const clearAll = () => {
        setQueue((prev) => {
            prev.forEach((x) => {
                try {
                    URL.revokeObjectURL(x.previewUrl);
                } catch {
                }
            });
            return [];
        });
    };

    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        addFiles(files);
        e.target.value = "";
    };

    const upload = async () => {
        setErr(null);
        setBusy(true);
        try {
            await uploadFilesToAssetsAndAttachToAlbum({albumId: props.albumId, files: queue.map((q) => q.file)});
            clearAll();
            props.onUploaded?.();
        } catch (e: any) {
            setErr(e?.message || t("studio.upload.error"));
        } finally {
            setBusy(false);
        }
    };

    const dropLabel = useMemo(() => t("studio.upload.hint"), [t]);

    return (
        <div className={cx(glassCard(), "overflow-hidden")}>
            <div className="p-5 border-b border-stone-100 bg-gradient-to-b from-stone-50 to-white">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className={pillBase()} data-tour="import">
                            <Sparkles size={14} className="text-rose-600"/>
                            {t("studio.welcome.upload.title")}
                        </div>
                        <div className="mt-2 text-sm font-black text-stone-900">{t("studio.upload.cta")}</div>
                        <div className="mt-1 text-xs text-stone-500">{dropLabel}</div>
                    </div>

                    <div
                        className="shrink-0 grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
                        <Upload size={18}/>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-emerald-600"/>
                            <div className="text-[12px] font-black text-stone-900">Privé</div>
                        </div>
                        <div className="mt-1 text-[11px] text-stone-500 leading-snug">
                            Vos fichiers restent dans votre espace (S3 privé).
                        </div>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-rose-600"/>
                            <div className="text-[12px] font-black text-stone-900">Prévisualisation</div>
                        </div>
                        <div className="mt-1 text-[11px] text-stone-500 leading-snug">
                            Vous voyez les aperçus avant l’import et pouvez retirer un item.
                        </div>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="flex items-center gap-2">
                            <Film size={16} className="text-amber-600"/>
                            <div className="text-[12px] font-black text-stone-900">Organisation</div>
                        </div>
                        <div className="mt-1 text-[11px] text-stone-500 leading-snug">
                            L’ordre se règle après, par glisser-déposer.
                        </div>
                    </div>
                </div>
            </div>

            <input ref={inputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={onPick}/>

            <div
                className="p-5"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files || []);
                    if (files.length) addFiles(files);
                }}
            >
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={cx(
                        "w-full rounded-3xl border border-stone-200 bg-white hover:bg-stone-50 transition p-6 text-left",
                        "shadow-[0_1px_0_rgba(0,0,0,0.03)]"
                    )}
                >
                    <div className="flex items-center gap-3" data-tour="welcome-upload">
                        <div
                            className="h-12 w-12 rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 grid place-items-center">
                            <Upload size={18} className="text-stone-900"/>
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-black text-stone-900">{t("studio.upload.cta")}</div>
                            <div className="mt-0.5 text-xs text-stone-500">{t("studio.upload.sub")}</div>
                        </div>
                    </div>
                </button>

                {queue.length > 0 ? (
                    <div className="mt-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-black text-stone-900">
                                {t("studio.upload.queue")} <span className="text-stone-500">({queue.length})</span>
                            </div>
                            <button
                                type="button"
                                onClick={clearAll}
                                className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 underline"
                            >
                                {t("studio.upload.clear")}
                            </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {queue.map((q) => (
                                <div key={q.id}
                                     className="relative rounded-2xl border border-stone-200 bg-white overflow-hidden">
                                    {isImage(q.file) ? (
                                        <img src={q.previewUrl} className="h-28 w-full object-cover" alt=""/>
                                    ) : (
                                        <div
                                            className="h-28 w-full bg-stone-900/90 grid place-items-center text-[11px] text-white/80">
                                            {t("studio.upload.video")}
                                        </div>
                                    )}

                                    <div className="p-2">
                                        <div
                                            className="text-[11px] font-semibold text-stone-700 truncate">{q.file.name}</div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => remove(q.id)}
                                        className="absolute top-2 right-2 h-8 w-8 rounded-xl border border-stone-200 bg-white/90 hover:bg-white grid place-items-center"
                                        aria-label="Remove"
                                    >
                                        <Trash2 size={14} className="text-stone-700"/>
                                    </button>

                                    <div
                                        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent hover:ring-stone-300/50 transition"/>
                                </div>
                            ))}
                        </div>

                        {err ? (
                            <div
                                className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                                {err}
                            </div>
                        ) : null}

                        <button
                            type="button"
                            disabled={!canUpload}
                            onClick={upload}
                            className={cx(
                                "mt-4 w-full px-4 py-3 rounded-2xl text-sm font-black transition flex items-center justify-center gap-2",
                                canUpload
                                    ? "bg-gradient-to-r from-rose-600 to-amber-500 text-white hover:opacity-[0.98] active:scale-[0.99]"
                                    : "bg-stone-200 text-stone-500"
                            )}
                        >
                            {busy ? <Loader2 size={16} className="animate-spin"/> : null}
                            {busy ? t("studio.upload.uploading") : t("studio.upload.confirm")}
                        </button>

                        <div className="mt-2 text-[11px] text-stone-500">
                            Astuce : commencez par 10–20 fichiers. Vous pourrez en ajouter à l’étape suivante.
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
