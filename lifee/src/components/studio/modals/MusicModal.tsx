"use client";

import React, { useMemo, useRef, useState } from "react";
import { Music, Search, X, Play, Pause } from "lucide-react";
import type { MusicTrack } from "@/types/studio";

export function MusicModal(props: {
    open: boolean;
    tracks: MusicTrack[];
    selectedId: string | null;
    onSelect: (track: MusicTrack | null) => void;
    onClose: () => void;
}) {
    const [q, setQ] = useState("");
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return props.tracks;
        return props.tracks.filter((t) => `${t.title} ${t.genre}`.toLowerCase().includes(s));
    }, [props.tracks, q]);

    const stop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setPlayingId(null);
    };

    const togglePreview = (t: MusicTrack) => {
        if (!t.previewUrl) return;
        if (playingId === t.id) {
            stop();
            return;
        }
        stop();
        audioRef.current = new Audio(t.previewUrl);
        audioRef.current.play().catch(() => {});
        setPlayingId(t.id);
        audioRef.current.onended = () => setPlayingId(null);
    };

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[65] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
                <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Music size={18} className="text-indigo-600" />
                        <div className="font-bold text-slate-800">Musique</div>
                    </div>
                    <button onClick={() => { stop(); props.onClose(); }} className="p-1.5 rounded-lg hover:bg-slate-200" aria-label="Fermer">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Rechercher..."
                            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                        <button
                            onClick={() => { stop(); props.onSelect(null); }}
                            className={`w-full text-left p-3 rounded-xl border transition ${
                                props.selectedId === null ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            <div className="font-bold text-sm text-slate-800">Sans musique</div>
                            <div className="text-xs text-slate-500">Exporter sans bande-son.</div>
                        </button>

                        {filtered.map((t) => (
                            <div
                                key={t.id}
                                className={`w-full p-3 rounded-xl border transition ${
                                    props.selectedId === t.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <button
                                        onClick={() => props.onSelect(t)}
                                        className="flex-1 text-left"
                                    >
                                        <div className="font-bold text-sm text-slate-800">{t.title}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {t.genre} • {t.duration}
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => togglePreview(t)}
                                        disabled={!t.previewUrl}
                                        className={`p-2 rounded-lg border ${
                                            t.previewUrl ? "border-slate-200 hover:bg-white" : "border-slate-100 text-slate-300 cursor-not-allowed"
                                        }`}
                                        aria-label="Preview"
                                        title={t.previewUrl ? "Écouter un extrait" : "Pas de preview"}
                                    >
                                        {playingId === t.id ? <Pause size={16} /> : <Play size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={() => { stop(); props.onClose(); }}
                            className="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
