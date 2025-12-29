"use client";

import React, {useMemo, useState} from "react";
import {ArrowRight, Play, ShieldCheck} from "lucide-react";

type Props = {
    onPrimaryCta?: () => void;
};

type Cat = "Tous" | "Mariage" | "Hommage" | "Enfance" | "Anniversaire" | "Transmission";

type Example = {
    id: string;
    cat: Exclude<Cat, "Tous">;
    title: string;
    desc: string;
    poster: string;
    src: string;
    duration: string;
};

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function VideoCard({x}: { x: Example }) {
    const [open, setOpen] = useState(false);

    return (
        <div
            className="group relative overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm hover:-translate-y-0.5 transition-all">
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent"/>
                <img src={x.poster} alt={x.title} className="w-full h-[220px] object-cover" loading="lazy"/>

                <button
                    onClick={() => setOpen((v) => !v)}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label={open ? "Fermer la vidéo" : "Lire la vidéo"}
                >
          <span
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/35 backdrop-blur px-4 py-2 text-white font-bold">
            <Play className="h-4 w-4"/>
              {open ? "Fermer" : "Voir"}
          </span>
                </button>

                <div
                    className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/35 backdrop-blur px-3 py-1 text-[11px] font-semibold text-white">
                    <span className="h-2 w-2 rounded-full bg-rose-400"/>
                    {x.cat} • {x.duration}
                </div>
            </div>

            <div className="p-5">
                <div className="text-sm font-black text-stone-900">{x.title}</div>
                <div className="mt-1 text-sm text-stone-600 leading-snug">{x.desc}</div>

                {open ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-black">
                        <video src={x.src} controls playsInline preload="metadata" className="w-full h-auto"/>
                    </div>
                ) : null}

                <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-stone-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-stone-400"/>
                    Partage privé • lien famille
                </div>
            </div>
        </div>
    );
}

export default function ExamplesGallery({onPrimaryCta}: Readonly<Props>) {
    const cats: Cat[] = ["Tous", "Mariage", "Hommage", "Enfance", "Anniversaire", "Transmission"];
    const [cat, setCat] = useState<Cat>("Tous");

    const examples: Example[] = useMemo(
        () => [
            {
                id: "ex-1",
                cat: "Mariage",
                title: "Le regard avant le “oui”",
                desc: "Animation subtile + musique douce. Style cinéma ancien.",
                poster: "/examples/gallery/mariage-1.jpg",
                src: "/examples/gallery/mariage-1.mp4",
                duration: "18s",
            },
            {
                id: "ex-2",
                cat: "Hommage",
                title: "Un hommage respectueux",
                desc: "Lumière chaude, mouvements minimalistes, émotion intacte.",
                poster: "/examples/gallery/hommage-1.jpg",
                src: "/examples/gallery/hommage-1.mp4",
                duration: "22s",
            },
            {
                id: "ex-3",
                cat: "Enfance",
                title: "L’été des souvenirs",
                desc: "Rythme léger, couleurs fidèles, “respiration” naturelle.",
                poster: "/examples/gallery/enfance-1.jpg",
                src: "/examples/gallery/enfance-1.mp4",
                duration: "16s",
            },
            {
                id: "ex-4",
                cat: "Transmission",
                title: "Une histoire à transmettre",
                desc: "Timeline → montage → export HD, prêt à regarder en famille.",
                poster: "/examples/gallery/transmission-1.jpg",
                src: "/examples/gallery/transmission-1.mp4",
                duration: "20s",
            },
        ],
        []
    );

    const filtered = useMemo(() => {
        if (cat === "Tous") return examples;
        return examples.filter((x) => x.cat === cat);
    }, [cat, examples]);

    return (
        <section
            id="exemples"
            className="relative overflow-hidden border-t border-stone-200 bg-gradient-to-b from-white via-stone-50 to-white py-20 scroll-mt-20"
        >
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl"/>
                <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl"/>
                <div
                    className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>
            </div>

            <div className="relative mx-auto max-w-7xl px-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div className="max-w-2xl">
                        <div
                            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600 shadow-sm backdrop-blur">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"/>
                            Exemples réels (preuve émotionnelle)
                        </div>

                        <h2 className="mt-5 text-3xl md:text-4xl font-serif text-stone-900 leading-tight">
                            Des films qui se regardent
                            <span
                                className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500 italic">
                {" "}
                                en silence.
              </span>
                        </h2>

                        <p className="mt-3 text-lg text-stone-600 leading-relaxed">
                            Ce n’est pas “de l’IA”. C’est une manière de <span className="text-stone-500">revivre</span>.
                        </p>
                    </div>

                    <button
                        onClick={onPrimaryCta}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 bg-stone-900 hover:bg-stone-800 text-white font-black shadow-lg transition"
                    >
                        Faire le mien <ArrowRight className="h-4 w-4"/>
                    </button>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                    {cats.map((c) => {
                        const active = c === cat;
                        return (
                            <button
                                key={c}
                                onClick={() => setCat(c)}
                                className={cx(
                                    "rounded-full border px-4 py-2 text-sm font-bold transition",
                                    active
                                        ? "bg-stone-900 text-white border-stone-900"
                                        : "bg-white/70 text-stone-700 border-stone-200 hover:bg-stone-50"
                                )}
                            >
                                {c}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {filtered.map((x) => (
                        <VideoCard key={x.id} x={x}/>
                    ))}
                </div>

                <div className="mt-8 text-[11px] text-stone-500">
                    Mets tes propres assets plus tard : posters `.jpg` + vidéos `.mp4` (preload metadata).
                </div>
            </div>
        </section>
    );
}
