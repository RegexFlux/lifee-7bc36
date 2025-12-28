// src/components/studio/upload/UploadWithPreview.tsx
"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import {Loader2, Trash2, Upload} from "lucide-react";
import {cx} from "@/components/studio/help/ui";
import {useT} from "@/lib/i18n/useT";

type QItem = { id: string; file: File; previewUrl: string };

function makeId() {
    return crypto.randomUUID?.() ?? String(Date.now() + Math.random());
}

function isImage(f: File) {
    return (f.type || "").startsWith("image/");
}

export function UploadWithPreview(props: Readonly<{
    onUpload: (files: File[]) => Promise<void>;
    onUploaded?: () => void;

    accept?: string; // default: "image/*,video/*"
    disabled?: boolean;

    className?: string; // container
    dropzoneClassName?: string;

    ctaTitle?: string; // override label
    ctaSub?: string;
    tip?: string | null;

    // data-tour hooks (optional)
    tourDropzone?: string;
}>) {
    const {t} = useT();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [queue, setQueue] = useState<QItem[]>([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const canUpload = queue.length > 0 && !busy && !props.disabled;

    const accept = props.accept || "image/*,video/*";

    const addFiles = (files: File[]) => {
        const next = files.map((f) => ({
            id: makeId(),
            file: f,
            previewUrl: URL.createObjectURL(f),
        }));
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

    // cleanup on unmount (avoid memory leaks)
    useEffect(() => {
        return () => {
            try {
                queue.forEach((x) => URL.revokeObjectURL(x.previewUrl));
            } catch {
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            await props.onUpload(queue.map((q) => q.file));
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
        <div
            className={cx(props.className)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                if (props.disabled) return;
                const files = Array.from(e.dataTransfer.files || []);
                if (files.length) addFiles(files);
            }}
        >
            <input
                ref={inputRef}
                type="file"
                multiple
                accept={accept}
                className="hidden"
                onChange={onPick}
                disabled={props.disabled}
            />

            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={props.disabled}
                className={cx(
                    "w-full rounded-3xl border border-stone-200 bg-white hover:bg-stone-50 transition p-6 text-left",
                    "shadow-[0_1px_0_rgba(0,0,0,0.03)]",
                    props.disabled && "opacity-60 cursor-not-allowed",
                    props.dropzoneClassName
                )}
            >
                <div className="flex items-center gap-3" data-tour={props.tourDropzone}>
                    <div
                        className="h-12 w-12 rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 grid place-items-center">
                        <Upload size={18} className="text-stone-900"/>
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-black text-stone-900">
                            {props.ctaTitle || t("studio.upload.cta")}
                        </div>
                        <div className="mt-0.5 text-xs text-stone-500">
                            {props.ctaSub || t("studio.upload.sub")}
                        </div>
                        <div className="mt-1 text-[11px] text-stone-400">{dropLabel}</div>
                    </div>
                </div>
            </button>

            {queue.length > 0 ? (
                <div className="mt-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-black text-stone-900">
                            {t("studio.upload.queue")}{" "}
                            <span className="text-stone-500">({queue.length})</span>
                        </div>
                        <button
                            type="button"
                            onClick={clearAll}
                            className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 underline"
                            disabled={busy}
                        >
                            {t("studio.upload.clear")}
                        </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {queue.map((q) => (
                            <div
                                key={q.id}
                                className="relative rounded-2xl border border-stone-200 bg-white overflow-hidden"
                            >
                                {isImage(q.file) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={q.previewUrl} className="h-28 w-full object-cover" alt=""/>
                                ) : (
                                    <div
                                        className="h-28 w-full bg-stone-900/90 grid place-items-center text-[11px] text-white/80">
                                        {t("studio.upload.video")}
                                    </div>
                                )}

                                <div className="p-2">
                                    <div className="text-[11px] font-semibold text-stone-700 truncate">
                                        {q.file.name}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => remove(q.id)}
                                    disabled={busy}
                                    className="absolute top-2 right-2 h-8 w-8 rounded-xl border border-stone-200 bg-white/90 hover:bg-white grid place-items-center disabled:opacity-60"
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

                    {props.tip === null ? null : (
                        <div className="mt-2 text-[11px] text-stone-500">
                            {props.tip || "Astuce : commencez par 10–20 fichiers. Vous pourrez en ajouter ensuite."}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
