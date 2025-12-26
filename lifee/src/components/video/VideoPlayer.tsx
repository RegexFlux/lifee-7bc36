// components/video/VideoPlayer.tsx
import React, {useEffect, useRef, useState} from "react";
import {Play, Pause, Maximize2, Minimize2} from "lucide-react";

export function VideoPlayer({
                                videoUrl,
                                showControls = true,
                            }: {
    videoUrl: string | null;
    showControls?: boolean;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const ref = useRef<HTMLVideoElement | null>(null);

    const [ready, setReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [showUI, setShowUI] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function clearHideTimer() {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
    }

    function scheduleHideUI() {
        clearHideTimer();
        hideTimer.current = setTimeout(() => setShowUI(false), 500);
    }

    // ---------- Fullscreen helpers ----------
    const syncFullscreenState = () => {
        const doc = document as any;
        const fsEl = document.fullscreenElement || doc.webkitFullscreenElement;
        setIsFullscreen(!!fsEl);
    };

    const requestFullscreen = async () => {
        const el = containerRef.current as any;
        const vid = ref.current as any;

        try {
            if (el?.requestFullscreen) {
                await el.requestFullscreen();
                return;
            }
            // Safari (some) uses webkitRequestFullscreen on elements
            if (el?.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
                return;
            }
            // iOS Safari: fullscreen is only supported on <video> via webkitEnterFullscreen
            if (vid?.webkitEnterFullscreen) {
                vid.webkitEnterFullscreen();
                return;
            }
        } catch {
            // ignore
        }
    };

    const exitFullscreen = async () => {
        const doc = document as any;
        try {
            if (document.fullscreenElement && document.exitFullscreen) {
                await document.exitFullscreen();
                return;
            }
            if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
                doc.webkitExitFullscreen();
                return;
            }
            // iOS video fullscreen exit is user-controlled; nothing reliable here.
        } catch {
            // ignore
        }
    };

    const toggleFullscreen = async (e?: React.SyntheticEvent) => {
        e?.stopPropagation?.();
        if (isFullscreen) await exitFullscreen();
        else await requestFullscreen();
    };

    useEffect(() => {
        const onFs = () => syncFullscreenState();
        document.addEventListener("fullscreenchange", onFs);
        document.addEventListener("webkitfullscreenchange", onFs as any);

        return () => {
            document.removeEventListener("fullscreenchange", onFs);
            document.removeEventListener("webkitfullscreenchange", onFs as any);
        };
    }, []);

    // iOS Safari: fullscreen events live on the <video> element
    useEffect(() => {
        const vid = ref.current as any;
        if (!vid?.addEventListener) return;

        const onBegin = () => setIsFullscreen(true);
        const onEnd = () => setIsFullscreen(false);

        vid.addEventListener("webkitbeginfullscreen", onBegin);
        vid.addEventListener("webkitendfullscreen", onEnd);

        return () => {
            vid.removeEventListener("webkitbeginfullscreen", onBegin);
            vid.removeEventListener("webkitendfullscreen", onEnd);
        };
    }, [videoUrl]);

    // Keyboard shortcuts (F / Esc)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement | null)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;

            if (e.key === "f" || e.key === "F") {
                e.preventDefault();
                void toggleFullscreen();
            }
            if (e.key === "Escape") {
                if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
                    e.preventDefault();
                    void exitFullscreen();
                }
            }
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFullscreen]);

    // reset on url change
    useEffect(() => {
        setReady(false);
        setPlaying(false);
        setHovered(false);
        setShowUI(true);
        setError(null);
        clearHideTimer();

        if (ref.current) {
            ref.current.pause();
            ref.current.currentTime = 0;
        }
        return () => clearHideTimer();
    }, [videoUrl]);

    async function tryPlay() {
        const el = ref.current;
        if (!el) return;

        try {
            const p = el.play();
            if (p) await p;
            setPlaying(true);
            // setShowUI(true);
            scheduleHideUI();
        } catch {
            setPlaying(false);
            setShowUI(true);
        }
    }

    function togglePlay() {
        const el = ref.current;
        if (!el) return;

        if (el.paused) {
            void tryPlay();
        } else {
            el.pause();
            setPlaying(false);
            setShowUI(true);
            clearHideTimer();
        }
    }

    function onEnter() {
        setHovered(true);
        setShowUI(true);
        clearHideTimer();
    }

    function onLeave() {
        setHovered(false);
        if (playing) {
            setShowUI(true);
            scheduleHideUI();
        }
    }

    const overlayVisible = showUI || !playing || hovered || !ready;

    return (
        <div
            ref={containerRef}
            className={[
                // fond noir + position fullscreen
                isFullscreen ? "fixed inset-0" : "absolute inset-0",
                "bg-black flex items-center justify-center overflow-hidden",
            ].join(" ")}
            onClick={togglePlay}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? togglePlay() : null)}
        >
            {videoUrl ? (
                <>
                    <video
                        ref={ref}
                        src={videoUrl}
                        // ✅ respecte toujours le format (pas de crop)
                        className="w-full h-full object-contain"
                        playsInline
                        muted
                        autoPlay
                        loop
                        preload="metadata"
                        onCanPlay={() => {
                            setReady(true);
                            void tryPlay();
                        }}
                        onPlay={() => {
                            setPlaying(true);
                            setShowUI(true);
                            scheduleHideUI();
                        }}
                        onPause={() => {
                            setPlaying(false);
                            setShowUI(true);
                            clearHideTimer();
                        }}
                        onEnded={() => {
                            const el = ref.current;
                            if (el) {
                                el.currentTime = 0;
                                void el.play().catch(() => {
                                });
                            }
                        }}
                        onError={() => setError("Impossible de charger la vidéo.")}
                    />

                    {/* Overlay */}
                    <div
                        className={[
                            "absolute inset-0 transition-opacity duration-200",
                            overlayVisible ? "opacity-100" : "opacity-0",
                        ].join(" ")}
                    >
                        {/* voile léger */}
                        <div className="absolute inset-0 bg-black/25 pointer-events-none"/>

                        {/* top-right controls */}
                        {showControls && (
                            <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-auto">
                                <button
                                    onClick={toggleFullscreen}
                                    className="rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-3 py-2 text-white/90 shadow-[0_0_24px_rgba(255,255,255,0.14)] transition"
                                    aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                                    title={isFullscreen ? "Quitter plein écran (Esc)" : "Plein écran (F)"}
                                >
                                    {isFullscreen ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                                </button>
                            </div>
                        )}

                        {/* centre play/pause */}
                        {showControls && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div
                                    className={[
                                        "grid place-items-center rounded-full w-20 h-20",
                                        "bg-white/10 backdrop-blur-md border border-white/20",
                                        "shadow-[0_0_30px_rgba(255,255,255,0.25)]",
                                    ].join(" ")}
                                >
                                    {playing ? (
                                        <Pause size={32} className="text-white"/>
                                    ) : (
                                        <Play size={32} className="fill-white text-white ml-1"/>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* hint bas gauche */}
                        <div
                            className="absolute left-4 bottom-4 text-[11px] font-mono text-white/80 pointer-events-none">
                            {playing ? "Cliquez pour pause" : "Cliquez pour lire"} •{" "}
                            {isFullscreen ? "Esc pour quitter" : "F pour plein écran"}
                        </div>
                    </div>

                    {error && (
                        <div
                            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white/80 text-sm">
                            {error}
                        </div>
                    )}
                </>
            ) : (
                <div className="text-white/70">Chargement…</div>
            )}
        </div>
    );
}
