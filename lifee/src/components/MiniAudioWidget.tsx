"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Music2, Pause, Play, Volume2, VolumeX, Sparkles } from "lucide-react";

type Props = {
    src: string; // ex: "/audio/ambient.mp3"
    title?: string; // ex: "Ambiance"
    defaultVolume?: number; // 0..1 (discret => 0.08-0.18)
    position?: "br" | "bl"; // bottom-right / bottom-left
    remember?: boolean; // mémorise play/pause + volume
    autoplay?: "on" | "try" | "off"; // on=essaie de démarrer (si possible), try=essaie + nudge si bloqué, off=jamais
    nudgeDurationMs?: number; // durée du hint "Tap to play"
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function MiniAudioWidget({
                                    src,
                                    title = "Ambiance",
                                    defaultVolume = 0.12,
                                    position = "br",
                                    remember = true,
                                    autoplay = "try",
                                    nudgeDurationMs = 4500,
                                }: Props) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const storageKey = useMemo(() => `mini-audio:${src}`, [src]);

    const [ready, setReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);

    const [volume, setVolume] = useState(defaultVolume);
    const [muted, setMuted] = useState(false);

    const [hint, setHint] = useState<string | null>(null);
    const hintTimerRef = useRef<number | null>(null);

    const showHint = (msg: string) => {
        setHint(msg);
        if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
        hintTimerRef.current = window.setTimeout(() => setHint(null), nudgeDurationMs);
    };

    // load prefs (and autoplay intention)
    useEffect(() => {
        if (!remember) {
            setReady(true);
            return;
        }
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const p = JSON.parse(raw) as { volume?: number; muted?: boolean; playing?: boolean };
                if (typeof p.volume === "number") setVolume(clamp(p.volume, 0, 1));
                if (typeof p.muted === "boolean") setMuted(p.muted);
                if (typeof p.playing === "boolean") setPlaying(p.playing);
            }
        } catch {
            // ignore
        }
        setReady(true);
    }, [remember, storageKey]);

    // sync audio props
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        a.volume = clamp(volume, 0, 1);
        a.muted = muted;
    }, [volume, muted]);

    // persist
    useEffect(() => {
        if (!remember || !ready) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify({ volume, muted, playing }));
        } catch {
            // ignore
        }
    }, [volume, muted, playing, remember, ready, storageKey]);

    const tryPlay = async (origin: "autoplay" | "user") => {
        const a = audioRef.current;
        if (!a) return false;

        // iOS / autoplay policies: must be initiated by user gesture in most cases
        // We still try, and if it fails we nudge.
        try {
            await a.play();
            setPlaying(true);
            setHint(null);
            return true;
        } catch {
            setPlaying(false);
            if (origin === "autoplay") showHint("Touchez pour activer la musique");
            else showHint("Impossible de lancer (réessayez)");
            return false;
        }
    };

    const pause = () => {
        const a = audioRef.current;
        if (!a) return;
        try {
            a.pause();
        } catch {}
        setPlaying(false);
    };

    const toggle = () => {
        setUserInteracted(true);
        if (playing) pause();
        else void tryPlay("user");
    };

    const toggleMute = () => {
        setUserInteracted(true);
        setMuted((m) => !m);
        if (!playing) void tryPlay("user");
    };

    // Track user gesture (so we can auto-start after first interaction anywhere)
    useEffect(() => {
        const onFirst = () => setUserInteracted(true);
        window.addEventListener("pointerdown", onFirst, { once: true, capture: true });
        window.addEventListener("keydown", onFirst, { once: true, capture: true });
        return () => {
            window.removeEventListener("pointerdown", onFirst as any, true);
            window.removeEventListener("keydown", onFirst as any, true);
        };
    }, []);

    // Autoplay behavior:
    // - "on": attempt immediately (may fail) and keep nudging
    // - "try": attempt if user previously intended playing OR after first interaction
    // - "off": never auto-start
    useEffect(() => {
        if (!ready) return;
        if (autoplay === "off") return;

        const shouldAttemptNow =
            autoplay === "on" ||
            (autoplay === "try" && (playing || userInteracted));

        if (!shouldAttemptNow) return;

        // If already truly playing, do nothing
        const a = audioRef.current;
        if (a && !a.paused) return;

        void tryPlay("autoplay");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, autoplay, userInteracted]);

    // If the tab becomes visible again and user intended playing, resume
    useEffect(() => {
        const onVis = () => {
            if (document.visibilityState !== "visible") return;
            if (autoplay === "off") return;
            if (!playing) return; // intention saved
            void tryPlay("autoplay");
        };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playing, autoplay]);

    useEffect(() => {
        return () => {
            if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
        };
    }, []);

    const posClass = position === "bl" ? "left-4 sm:left-6" : "right-4 sm:right-6";

    return (
        <>
            <audio
                ref={audioRef}
                src={src}
                preload="auto"
                loop
                playsInline
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
            />

            <div className={`fixed bottom-4 sm:bottom-6 ${posClass} z-[70]`}>
                <div className="group relative flex items-center gap-2">
                    {/* Desktop pill (hover) */}
                    <div className="hidden sm:block">
                        <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 backdrop-blur px-3 py-2 shadow-sm">
                                <Music2 size={14} className="text-rose-500" />
                                <div className="text-xs text-stone-700 font-semibold max-w-[160px] truncate">
                                    {title}
                                </div>

                                <button
                                    onClick={toggleMute}
                                    className="ml-1 rounded-xl border border-stone-200 bg-white/80 hover:bg-white px-2 py-1 transition"
                                    aria-label={muted ? "Activer le son" : "Couper le son"}
                                    title={muted ? "Unmute" : "Mute"}
                                >
                                    {muted ? (
                                        <VolumeX size={14} className="text-stone-500" />
                                    ) : (
                                        <Volume2 size={14} className="text-stone-700" />
                                    )}
                                </button>

                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={volume}
                                    onChange={(e) => {
                                        setUserInteracted(true);
                                        setVolume(Number(e.target.value));
                                    }}
                                    className="w-20 accent-rose-500"
                                    aria-label="Volume"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main control (mobile-first) */}
                    <button
                        onClick={toggle}
                        className={[
                            "relative h-11 w-11 rounded-2xl border",
                            "bg-white/85 backdrop-blur",
                            "border-stone-200 shadow-sm",
                            "hover:bg-white active:scale-[0.98] transition",
                            "flex items-center justify-center",
                        ].join(" ")}
                        aria-label={playing ? "Pause musique" : "Lire musique"}
                        title={playing ? "Pause" : "Play"}
                    >
                        {/* subtle glow when playing */}
                        {playing && (
                            <span
                                aria-hidden="true"
                                className="absolute -inset-2 rounded-[1.25rem] bg-rose-200/40 blur-xl"
                            />
                        )}

                        <span className="relative">
                            {playing ? (
                                <Pause size={16} className="text-stone-800" />
                            ) : (
                                <Play size={16} className="text-stone-800" />
                            )}
                        </span>

                        {/* tiny “autoplay available” hint */}
                        {!playing && hint && (
                            <span className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center shadow">
                                <Sparkles size={11} />
                            </span>
                        )}
                    </button>

                    {/* Hint bubble (mobile + desktop) */}
                    {hint && (
                        <div className="absolute bottom-0 translate-y-[calc(100%+10px)] right-0 sm:right-auto sm:left-0">
                            <div className="rounded-2xl border border-stone-200 bg-white/90 backdrop-blur px-3 py-2 shadow-md">
                                <div className="text-[11px] font-semibold text-stone-800">{hint}</div>
                                <div className="mt-0.5 text-[11px] text-stone-500">
                                    Astuce : ça démarre après un tap (règles mobile).
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
