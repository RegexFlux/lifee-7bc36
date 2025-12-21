// components/lifee/VideoPlayer.tsx
import React, { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

export function VideoPlayer({ videoUrl }: { videoUrl: string | null }) {
    const ref = useRef<HTMLVideoElement | null>(null);

    const [ready, setReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [showUI, setShowUI] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function clearHideTimer() {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
    }

    function scheduleHideUI() {
        clearHideTimer();
        // cache après 2s seulement si on lit et pas hover
        hideTimer.current = setTimeout(() => {
            setShowUI(false);
        }, 2000);
    }

    useEffect(() => {
        // reset on url change
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
        // cleanup
        return () => clearHideTimer();
    }, [videoUrl]);

    async function tryPlay() {
        const el = ref.current;
        if (!el) return;

        try {
            const p = el.play();
            if (p) await p;
            setPlaying(true);
            // on affiche l’UI au démarrage puis on la cache
            setShowUI(true);
            scheduleHideUI();
        } catch {
            setPlaying(false);
            // si autoplay bloqué, on laisse l’UI visible pour inciter au clic
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
            // pause => UI visible
            setShowUI(true);
            clearHideTimer();
        }
    }

    // Gestion hover: UI visible + re-hide après sortie (si en lecture)
    function onEnter() {
        setHovered(true);
        setShowUI(true);
        clearHideTimer();
    }
    function onLeave() {
        setHovered(false);
        if (playing) {
            // re-cache après 2s
            setShowUI(true);
            scheduleHideUI();
        }
    }

    const overlayVisible = showUI || !playing || hovered || !ready;

    return (
        <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
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
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                        autoPlay
                        loop
                        preload="metadata"
                        onCanPlay={() => {
                            setReady(true);
                            // autoplay silencieux + loop
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
                            // auto replay robuste (en plus de loop)
                            const el = ref.current;
                            if (el) {
                                el.currentTime = 0;
                                void el.play().catch(() => {});
                            }
                        }}
                        onError={() => setError("Impossible de charger la vidéo.")}
                    />

                    {/* Overlay (infos) : visible au démarrage, puis fade out en 2s.
              Réapparait au hover ou pause. */}
                    <div
                        className={[
                            "absolute inset-0 pointer-events-none transition-opacity duration-500",
                            overlayVisible ? "opacity-100" : "opacity-0",
                        ].join(" ")}
                    >
                        {/* léger voile uniquement quand overlay visible */}
                        <div className="absolute inset-0 bg-black/25" />

                        {/* centre: bouton play/pause */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div
                                className={[
                                    "grid place-items-center rounded-full w-20 h-20",
                                    "bg-white/10 backdrop-blur-md border border-white/20",
                                    "shadow-[0_0_30px_rgba(255,255,255,0.25)]",
                                    // si ça joue + hover => visible ; si ça joue sans hover => disparaît avec overlay
                                    "transition-transform duration-200",
                                    hovered || !playing ? "scale-100" : "scale-100",
                                ].join(" ")}
                            >
                                {playing ? (
                                    <Pause size={32} className="text-white" />
                                ) : (
                                    <Play size={32} className="fill-white text-white ml-1" />
                                )}
                            </div>
                        </div>

                        {/* petit hint bas gauche */}
                        <div className="absolute left-4 bottom-4 text-[11px] font-mono text-white/80">
                            {playing ? "Cliquez pour pause" : "Cliquez pour lire"}
                        </div>
                    </div>

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white/80 text-sm">
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
