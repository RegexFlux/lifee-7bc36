"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import {ArrowRight, Volume2, VolumeX, ShieldCheck, Sparkles} from "lucide-react";

type Props = {
    onPrimaryCta?: () => void;
    videoSrc?: string;
    posterSrc?: string;
};

type Caption = { t0: number; t1: number; text: string };

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        try {
            const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
            const onChange = () => setReduced(!!mq.matches);
            onChange();
            mq.addEventListener?.("change", onChange);
            return () => mq.removeEventListener?.("change", onChange);
        } catch {
            setReduced(false);
        }
    }, []);
    return reduced;
}

export default function EmotionalHeroFilm({
                                              onPrimaryCta,
                                              videoSrc = "/examples/hero/film.mp4",
                                              posterSrc = "/examples/hero/film-poster.png",
                                          }: Readonly<Props>) {
    const reduced = usePrefersReducedMotion();
    const ref = useRef<HTMLVideoElement | null>(null);

    const [muted, setMuted] = useState(true);
    const [playing, setPlaying] = useState(!reduced);
    const [t, setT] = useState(0);

    const captions: Caption[] = useMemo(
        () => [
            {t0: 0.2, t1: 3.2, text: "Un souvenir…"},
            {t0: 3.2, t1: 8.0, text: "…ne devrait pas rester immobile."},
            {t0: 8.0, t1: 13.0, text: "Pour revivre l’instant."},
            {t0: 13.0, t1: 18.2, text: "Déposez. Organisez. Lifee crée le film."},
            {t0: 18.2, t1: 24.2, text: "À regarder ensemble. À transmettre."},
            {t0: 24.2, t1: 28.8, text: "Lifee — un film de vie."},
        ],
        []
    );

    const activeCaption = useMemo(() => {
        return captions.find((c) => t >= c.t0 && t < c.t1)?.text || "";
    }, [captions, t]);

    // autoplay (muted) unless reduced motion
    useEffect(() => {
        if (reduced) return;
        const v = ref.current;
        if (!v) return;
        v.muted = true;
        v.playsInline = true;

        const tryPlay = async () => {
            try {
                await v.play();
                setPlaying(true);
            } catch {
                setPlaying(false);
            }
        };
        tryPlay();
    }, [reduced]);

    // time sync
    useEffect(() => {
        const v = ref.current;
        if (!v) return;

        let raf = 0;
        const loop = () => {
            setT(v.currentTime || 0);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const togglePlay = async () => {
        const v = ref.current;
        if (!v) return;
        try {
            if (v.paused) {
                await v.play();
                setPlaying(true);
            } else {
                v.pause();
                setPlaying(false);
            }
        } catch {
            // ignore
        }
    };

    const toggleMute = () => {
        const v = ref.current;
        if (!v) return;
        const next = !muted;
        v.muted = next;
        setMuted(next);
    };

    return (
        <section
            className="relative overflow-hidden border-t border-stone-200 bg-gradient-to-b from-stone-50 via-white to-stone-50 py-20">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-28 left-[10%] h-96 w-96 rounded-full bg-rose-200/30 blur-3xl"/>
                <div className="absolute -bottom-28 right-[10%] h-96 w-96 rounded-full bg-amber-200/30 blur-3xl"/>
                <div
                    className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>
            </div>

            <div className="relative mx-auto max-w-7xl px-6">
                <div className="grid lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-5">
                        <div
                            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600 shadow-sm backdrop-blur">
                            <Sparkles className="h-3.5 w-3.5 text-rose-600"/>
                            Une scène d’ouverture (cinéma)
                        </div>

                        <h2 className="mt-5 text-3xl md:text-4xl font-serif text-stone-900 leading-tight">
                            Faites ressentir l’histoire.
                            <span
                                className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500 italic">
                {" "}
                                Pas seulement la montrer.
              </span>
                        </h2>

                        <p className="mt-4 text-lg text-stone-600 leading-relaxed">
                            Un rendu doux, respectueux, conçu pour la famille. <span className="text-stone-500">Partage privé, zéro réseaux.</span>
                        </p>

                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={onPrimaryCta}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 bg-stone-900 hover:bg-stone-800 text-white font-black shadow-lg transition"
                            >
                                Créer mon film <ArrowRight className="h-4 w-4"/>
                            </button>

                            <div
                                className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-600 backdrop-blur">
                                <ShieldCheck className="h-4 w-4 text-stone-500"/>
                                Lien privé • famille seulement
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                        <div className="relative">
                            <div
                                className="absolute -inset-6 bg-gradient-to-tr from-rose-200/55 to-amber-200/55 blur-3xl opacity-55 rounded-[2.5rem]"/>

                            <div
                                className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-black shadow-2xl">
                                {/* Video */}
                                <button
                                    type="button"
                                    onClick={togglePlay}
                                    className="relative block w-full text-left"
                                    aria-label={playing ? "Mettre en pause" : "Lire la vidéo"}
                                >
                                    <video
                                        ref={ref}
                                        className="w-full h-[420px] sm:h-[460px] md:h-[520px] object-cover"
                                        src={videoSrc}
                                        poster={posterSrc}
                                        preload="metadata"
                                        muted={muted}
                                        playsInline
                                        loop
                                    />

                                    {/* overlays */}
                                    <div
                                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/15"/>
                                    <div
                                        className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>

                                    {/* caption */}
                                    <div className="pointer-events-none absolute left-0 right-0 bottom-6 px-5">
                                        <div className="mx-auto max-w-xl text-center">
                                            <div
                                                className={cx(
                                                    "inline-block rounded-2xl border border-white/20 bg-black/35 backdrop-blur px-4 py-2",
                                                    "text-white/95 text-sm sm:text-base font-semibold"
                                                )}
                                            >
                                                {activeCaption || " "}
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* controls (simple, premium) */}
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    <button
                                        onClick={toggleMute}
                                        className="h-10 w-10 rounded-2xl border border-white/15 bg-black/35 backdrop-blur text-white flex items-center justify-center hover:bg-black/45 transition"
                                        aria-label={muted ? "Activer le son" : "Couper le son"}
                                    >
                                        {muted ? <VolumeX className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}
                                    </button>

                                    <div
                                        className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black/35 backdrop-blur px-3 py-2 text-[11px] text-white/85">
                                        Cliquez pour {playing ? "pause" : "lecture"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
