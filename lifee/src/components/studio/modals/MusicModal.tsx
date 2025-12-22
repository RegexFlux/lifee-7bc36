"use client";

// src/components/studio/MusicModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Music2,
    Search,
    X,
    Play,
    Pause,
    Upload,
    CheckCircle2,
    Tag,
    Timer,
    Music,
} from "lucide-react";
import type { MusicTrack } from "@/types/studio";

export type CustomTrack = {
    id: string; // ex: "custom:<uuid>" ou id DB
    title: string;
    duration?: string;
    url?: string; // lecture
    previewUrl?: string; // optionnel
};

export function MusicModal(props: Readonly<{
    open: boolean;
    tracks: MusicTrack[];
    selectedId: string | null; // presets (null => sans musique)
    selectedCustom?: CustomTrack | null;

    onSelect: (track: MusicTrack | null) => void; // presets / null
    onSelectCustom?: (track: CustomTrack | null) => void;

    onUploadCustom?: (file: File) => Promise<CustomTrack>; // API upload
    onClose: () => void;
}>) {
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const [q, setQ] = useState("");
    const [playingId, setPlayingId] = useState<string | null>(null);

    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const [progress, setProgress] = useState<Record<string, number>>({}); // 0..1

    const sheetRef = useRef<HTMLDivElement | null>(null);
    const lastActiveRef = useRef<HTMLElement | null>(null);

    // drag-to-close (mobile)
    const dragRef = useRef<{ y0: number; dy: number; dragging: boolean } | null>(null);
    const [dragY, setDragY] = useState(0);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const selectedTrack = useMemo(() => {
        if (!props.selectedId) return null;
        return props.tracks.find((t) => t.id === props.selectedId) || null;
    }, [props.selectedId, props.tracks]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return props.tracks;
        return props.tracks.filter((t) => `${t.title} ${t.genre}`.toLowerCase().includes(s));
    }, [props.tracks, q]);

    const stop = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;

        const a = audioRef.current;
        if (a) {
            try {
                a.pause();
                a.currentTime = 0;
            } catch {}
        }
        audioRef.current = null;
        setPlayingId(null);
    };

    const tickProgress = (id: string) => {
        const a = audioRef.current;
        if (!a) return;

        const dur = a.duration || 0;
        const cur = a.currentTime || 0;
        const ratio = dur > 0 ? cur / dur : 0;
        setProgress((p) => ({ ...p, [id]: ratio }));

        rafRef.current = requestAnimationFrame(() => tickProgress(id));
    };

    const playUrl = (id: string, url: string) => {
        stop();
        const a = new Audio(url);
        a.preload = "auto";
        audioRef.current = a;

        a.play().catch(() => {});
        setPlayingId(id);
        tickProgress(id);

        a.onended = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            setPlayingId(null);
            setProgress((p) => ({ ...p, [id]: 0 }));
        };
    };

    const togglePreviewPreset = (t: MusicTrack) => {
        if (!t.previewUrl) return;
        if (playingId === t.id) {
            stop();
            return;
        }
        playUrl(t.id, t.previewUrl);
    };

    const togglePreviewCustom = () => {
        const ct = props.selectedCustom;
        if (!ct) return;
        const url = ct.previewUrl || ct.url;
        if (!url) return;

        if (playingId === ct.id) {
            stop();
            return;
        }
        playUrl(ct.id, url);
    };

    // detect mobile
    useEffect(() => {
        setMounted(true);
        const update = () => {
            try {
                setIsMobile(window.matchMedia("(max-width: 640px)").matches);
            } catch {
                setIsMobile(false);
            }
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // body scroll lock + focus restore
    useEffect(() => {
        if (!props.open) return;
        lastActiveRef.current = document.activeElement as HTMLElement | null;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
            lastActiveRef.current?.focus?.();
        };
    }, [props.open]);

    // ESC + cleanup
    useEffect(() => {
        if (!props.open) {
            stop();
            setQ("");
            setDragY(0);
            setUploadErr(null);
            setDragOver(false);
            return;
        }

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                stop();
                props.onClose();
            }
        };

        window.addEventListener("keydown", onKey);

        const t = window.setTimeout(() => {
            const el = sheetRef.current;
            if (!el) return;
            const first = el.querySelector<HTMLElement>(
                "input, button, [href], select, textarea, [tabindex]:not([tabindex='-1'])"
            );
            first?.focus();
        }, 60);

        return () => {
            window.clearTimeout(t);
            window.removeEventListener("keydown", onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.open]);

    const close = () => {
        stop();
        props.onClose();
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (!isMobile) return;
        dragRef.current = { y0: e.clientY, dy: 0, dragging: true };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isMobile) return;
        const st = dragRef.current;
        if (!st?.dragging) return;
        const dy = Math.max(0, e.clientY - st.y0);
        st.dy = dy;
        setDragY(dy);
    };

    const onPointerUp = () => {
        if (!isMobile) return;
        const st = dragRef.current;
        if (!st?.dragging) return;
        const dy = st.dy || 0;
        dragRef.current = null;

        if (dy > 120) {
            close();
            setDragY(0);
            return;
        }
        setDragY(0);
    };

    const showCustom = !!props.onUploadCustom && !!props.onSelectCustom;

    const handlePickFile = () => {
        setUploadErr(null);
        fileInputRef.current?.click();
    };

    const handleUpload = async (file: File | null) => {
        if (!file) return;
        if (!props.onUploadCustom || !props.onSelectCustom) return;

        setUploading(true);
        setUploadErr(null);
        try {
            const custom = await props.onUploadCustom(file);
            // sélectionner custom => désélectionner preset
            props.onSelect(null);
            props.onSelectCustom(custom);
        } catch (e: any) {
            setUploadErr(e?.message || "Upload impossible");
        } finally {
            setUploading(false);
            setDragOver(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const onDropZoneDragOver = (e: React.DragEvent) => {
        if (!showCustom) return;
        e.preventDefault();
        setDragOver(true);
        e.dataTransfer.dropEffect = "copy";
    };

    const onDropZoneDragLeave = () => setDragOver(false);

    const onDropZoneDrop = (e: React.DragEvent) => {
        if (!showCustom) return;
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0] ?? null;
        if (!file) return;
        if (!file.type.startsWith("audio/")) {
            setUploadErr("Format non supporté. Utilisez un fichier audio (mp3, wav, m4a…).");
            return;
        }
        handleUpload(file);
    };

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-[65]">
            {/* Backdrop */}
            <div
                className={[
                    "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity",
                    mounted ? "opacity-100" : "opacity-0",
                ].join(" ")}
                onClick={close}
            />

            {/* Wrapper */}
            <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div
                    ref={sheetRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Choisir une musique"
                    className={[
                        "relative w-full sm:max-w-lg",
                        "rounded-t-3xl sm:rounded-3xl overflow-hidden",
                        "bg-white border border-slate-200 shadow-2xl",
                        isMobile ? "animate-in slide-in-from-bottom-8 duration-200" : "animate-in zoom-in-95 duration-200",
                    ].join(" ")}
                    style={{ transform: isMobile ? `translateY(${dragY}px)` : undefined }}
                >
                    {/* Drag handle (mobile) */}
                    <div className="sm:hidden px-4 pt-3">
                        <div
                            className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 cursor-grab active:cursor-grabbing"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                        />
                    </div>

                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                                    <Music2 size={12} className="text-rose-600" />
                                    Bande-son • preview instantanée
                                </div>

                                <div className="mt-3 text-sm font-black text-slate-900">Choisir une musique</div>

                                <div className="mt-1 text-xs text-slate-500">
                                    {props.selectedCustom ? (
                                        <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Sélection :{" "}
                                            <span className="font-semibold text-slate-800 truncate">{props.selectedCustom.title}</span>
                    </span>
                                    ) : selectedTrack ? (
                                        <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Sélection : <span className="font-semibold text-slate-800 truncate">{selectedTrack.title}</span>
                    </span>
                                    ) : (
                                        "Aucune musique sélectionnée"
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={close}
                                className="shrink-0 p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200"
                                aria-label="Fermer"
                            >
                                <X size={18} className="text-slate-600" />
                            </button>
                        </div>

                        {/* Search + Dropzone */}
                        <div className="mt-4 grid grid-cols-1 gap-2">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/3 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Rechercher par titre, genre…"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-rose-100"
                                />
                            </div>

                            {/* Dropzone */}
                            {showCustom ? (
                                <div
                                    onDragOver={onDropZoneDragOver}
                                    onDragLeave={onDropZoneDragLeave}
                                    onDrop={onDropZoneDrop}
                                    className={[
                                        "rounded-xl border-2 border-dashed px-3 py-2.5 text-sm",
                                        dragOver ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white",
                                    ].join(" ")}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                                    />

                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                                                <Music size={16} className={dragOver ? "text-rose-600" : "text-slate-500"} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-900 truncate">
                                                    {uploading ? "Import en cours…" : "Glissez votre piste ici"}
                                                </div>
                                                <div className="text-[11px] text-slate-500 truncate">
                                                    mp3, wav, m4a… (ou appuyez sur Importer)
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handlePickFile}
                                            disabled={uploading}
                                            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-60 flex items-center gap-2"
                                        >
                                            <Upload size={14} className="text-indigo-600" />
                                            Importer
                                        </button>
                                    </div>

                                    {uploadErr && <div className="mt-2 text-[11px] text-rose-600">{uploadErr}</div>}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] text-slate-500 flex items-center">
                                    Upload perso désactivé (branche `onUploadCustom`).
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Body list */}
                    <div className="p-4 sm:p-5">
                        <div className="space-y-2 max-h-[56vh] sm:max-h-[440px] overflow-auto pr-1">
                            {/* None */}
                            <button
                                onClick={() => {
                                    stop();
                                    props.onSelectCustom?.(null);
                                    props.onSelect(null);
                                }}
                                className={[
                                    "w-full text-left p-4 rounded-2xl border transition",
                                    props.selectedId === null && !props.selectedCustom ? "border-rose-200 bg-rose-50" : "border-slate-200 hover:bg-slate-50 bg-white",
                                ].join(" ")}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-900">Sans musique</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Exporter sans bande-son.</div>
                                    </div>
                                    <div className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                                        <Music2 size={16} className="text-slate-500" />
                                    </div>
                                </div>
                            </button>

                            {/* Custom selected */}
                            {props.selectedCustom && (
                                <div className="w-full p-4 rounded-2xl border border-rose-200 bg-rose-50/50 transition">
                                    <div className="flex items-start justify-between gap-3">
                                        <button
                                            onClick={() => {
                                                stop();
                                                props.onSelect(null);
                                                props.onSelectCustom?.(props.selectedCustom || null);
                                            }}
                                            className="flex-1 text-left min-w-0"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="h-10 w-10 rounded-xl border border-rose-200 bg-rose-50 flex items-center justify-center">
                                                    <Music2 size={16} className="text-rose-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-slate-900 truncate">{props.selectedCustom.title}</div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
                              <Tag size={12} className="text-amber-600" />
                              Votre musique
                            </span>
                                                        {props.selectedCustom.duration ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
                                <Timer size={12} className="text-amber-600" />
                                                                {props.selectedCustom.duration}
                              </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={togglePreviewCustom}
                                            disabled={!(props.selectedCustom.previewUrl || props.selectedCustom.url)}
                                            className={[
                                                "p-2 rounded-xl border",
                                                props.selectedCustom.previewUrl || props.selectedCustom.url
                                                    ? "border-slate-200 hover:bg-white"
                                                    : "border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50",
                                            ].join(" ")}
                                            aria-label="Preview custom"
                                            title="Écouter un extrait"
                                        >
                                            {playingId === props.selectedCustom.id ? <Pause size={16} /> : <Play size={16} />}
                                        </button>
                                    </div>

                                    <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                        <div
                                            className="h-full rounded-full transition-all duration-150"
                                            style={{
                                                width: `${Math.max(0, Math.min(1, progress[props.selectedCustom.id] ?? 0)) * 100}%`,
                                                backgroundImage: "linear-gradient(90deg, rgba(251,113,133,0.95), rgba(245,158,11,0.95))",
                                                opacity: playingId === props.selectedCustom.id ? 1 : 0.35,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Presets */}
                            {filtered.map((t) => {
                                const active = props.selectedId === t.id && !props.selectedCustom;
                                const isPlaying = playingId === t.id;
                                const pr = progress[t.id] ?? 0;

                                return (
                                    <div
                                        key={t.id}
                                        className={[
                                            "w-full p-4 rounded-2xl border transition bg-white",
                                            active ? "border-rose-200 bg-rose-50" : "border-slate-200 hover:bg-slate-50",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <button
                                                onClick={() => {
                                                    stop();
                                                    props.onSelectCustom?.(null);
                                                    props.onSelect(t);
                                                }}
                                                className="flex-1 text-left min-w-0"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={[
                                                            "h-10 w-10 rounded-xl border flex items-center justify-center",
                                                            active ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50",
                                                        ].join(" ")}
                                                    >
                                                        <Music2 size={16} className={active ? "text-rose-600" : "text-slate-500"} />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-slate-900 truncate">{t.title}</div>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
                                <Tag size={12} className="text-amber-600" />
                                  {t.genre}
                              </span>
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
                                <Timer size={12} className="text-amber-600" />
                                                                {t.duration}
                              </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => togglePreviewPreset(t)}
                                                disabled={!t.previewUrl}
                                                className={[
                                                    "p-2 rounded-xl border",
                                                    t.previewUrl ? "border-slate-200 hover:bg-white" : "border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50",
                                                ].join(" ")}
                                                aria-label="Preview"
                                                title={t.previewUrl ? "Écouter un extrait" : "Pas de preview"}
                                            >
                                                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                            </button>
                                        </div>

                                        <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                            <div
                                                className="h-full rounded-full transition-all duration-150"
                                                style={{
                                                    width: `${Math.max(0, Math.min(1, pr)) * 100}%`,
                                                    backgroundImage: "linear-gradient(90deg, rgba(251,113,133,0.95), rgba(245,158,11,0.95))",
                                                    opacity: isPlaying ? 1 : 0.35,
                                                }}
                                            />
                                        </div>

                                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                            <span>{isPlaying ? "Lecture…" : " "}</span>
                                            {active ? (
                                                <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          Sélectionnée
                        </span>
                                            ) : (
                                                <span />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-500">Astuce : une musique douce rend le montage plus “cinéma”.</div>
                        <button
                            onClick={close}
                            className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
                        >
                            Terminé
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
