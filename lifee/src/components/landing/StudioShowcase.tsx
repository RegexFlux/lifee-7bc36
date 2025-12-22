import React from "react";
import {
    ArrowRight,
    Wand2,
    GripHorizontal,
    Music,
    Download,
    Sparkles,
    ShieldCheck,
    LayoutGrid,
    SlidersHorizontal,
    UploadCloud,
    CalendarClock,
    HeartHandshake,
} from "lucide-react";

type Props = {
    screenshotSrc?: string; // grande capture
    step1ScreenshotSrc?: string; // Déposez vos photos
    step2ScreenshotSrc?: string; // Organiser l'histoire
    step3ScreenshotSrc?: string; // Partagez en famille
    onPrimaryCta?: () => void;
};

const FEATURES = [
    {
        icon: <LayoutGrid size={16} />,
        title: "Bibliothèque intelligente",
        desc: "Retrouvez vos médias en 2 secondes : recherche, tri, et thumbnails.",
    },
    {
        icon: <GripHorizontal size={16} />,
        title: "Timeline drag & drop",
        desc: "Construisez votre film comme un montage pro, sans courbe d’apprentissage.",
    },
    {
        icon: <Wand2 size={16} />,
        title: "Génération IA guidée",
        desc: "Ajoutez du mouvement et une ambiance cinématique à partir d’une seule photo.",
    },
    {
        icon: <Music size={16} />,
        title: "Musique & rythme",
        desc: "Choisissez une bande-son et donnez immédiatement du souffle à l’émotion.",
    },
    {
        icon: <Download size={16} />,
        title: "Export HD",
        desc: "Un rendu propre, prêt à partager et à sauvegarder.",
    },
];

const STEPS = [
    {
        k: "1",
        icon: <UploadCloud size={16} />,
        title: "Déposez vos photos",
        desc: "Import instantané. Vos souvenirs se rangent automatiquement.",
        badge: "Upload",
        tone: "rose" as const,
        screenshotKey: "step1" as const,
    },
    {
        k: "2",
        icon: <CalendarClock size={16} />,
        title: "Organisez l’histoire de votre proche",
        desc: "Glissez-déposez. Le film se construit comme un récit, sans effort.",
        badge: "Timeline",
        tone: "amber" as const,
        screenshotKey: "step2" as const,
    },
    {
        k: "3",
        icon: <HeartHandshake size={16} />,
        title: "Partagez des émotions en famille",
        desc: "Un export propre, prêt à envoyer. Un moment à revivre ensemble.",
        badge: "Partage",
        tone: "emerald" as const,
        screenshotKey: "step3" as const,
    },
];

function toneClasses(tone: "rose" | "amber" | "emerald") {
    if (tone === "rose")
        return {
            iconWrap: "bg-rose-50 text-rose-600 border-rose-100",
            badge: "bg-rose-600",
            glow: "from-rose-200/55 to-amber-200/20",
            ring: "ring-rose-200/50",
        };
    if (tone === "amber")
        return {
            iconWrap: "bg-amber-50 text-amber-700 border-amber-100",
            badge: "bg-amber-600",
            glow: "from-amber-200/55 to-rose-200/20",
            ring: "ring-amber-200/50",
        };
    return {
        iconWrap: "bg-emerald-50 text-emerald-700 border-emerald-100",
        badge: "bg-emerald-600",
        glow: "from-emerald-200/55 to-amber-200/20",
        ring: "ring-emerald-200/50",
    };
}

export default function StudioShowcase({
                                           screenshotSrc = "/examples/studio/dashboard.png",
                                           step1ScreenshotSrc = "/examples/studio/step-upload.png",
                                           step2ScreenshotSrc = "/examples/studio/step-timeline.png",
                                           step3ScreenshotSrc = "/examples/studio/step-export.png",
                                           onPrimaryCta,
                                       }: Readonly<Props>) {
    const stepScreens = {
        step1: step1ScreenshotSrc,
        step2: step2ScreenshotSrc,
        step3: step3ScreenshotSrc,
    };

    return (
        <section className="relative overflow-hidden border-t border-stone-200 bg-gradient-to-b from-stone-50 via-white to-stone-50 py-24">
            {/* Background decor */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
                <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
                <div className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <div className="relative mx-auto max-w-7xl px-6">
                {/* Header */}
                <div className="mx-auto mb-14 max-w-3xl text-center">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600 shadow-sm backdrop-blur">
                        <Sparkles size={12} className="text-rose-500" />
                        Le studio pensé pour convertir une émotion en film — rapidement
                    </div>

                    <h2 className="text-3xl md:text-5xl font-serif text-stone-900 leading-tight">
                        Le Studio : simple comme un album,
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500 italic">
              {" "}
                            puissant comme une suite pro.
            </span>
                    </h2>

                    <p className="mt-4 text-stone-600 text-lg leading-relaxed">
                        Importez → organisez → animez → ajoutez la musique → exportez.
                        <br/>
                        <br/>
                        <span className="text-stone-500"> Tout est guidé, tout est fluide.</span>
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={onPrimaryCta}
                            className="px-7 py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                        >
                            Voir mon studio <ArrowRight size={18} />
                        </button>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <ShieldCheck size={14} className="text-stone-500" />
                            Données privées • Accès sécurisé • Sauvegarde automatique
                        </div>
                    </div>
                </div>

                {/* Main layout */}
                <div className="grid lg:grid-cols-12 gap-10 items-start">
                    {/* Left: feature list */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="rounded-2xl border border-stone-200 bg-white/70 backdrop-blur shadow-sm p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="text-sm font-bold text-stone-900">Fonctionnalités clés</div>
                                <div className="inline-flex items-center gap-1 text-[11px] text-stone-500">
                                    <SlidersHorizontal size={12} />
                                    Ultra-guidé
                                </div>
                            </div>

                            <div className="space-y-3">
                                {FEATURES.map((f) => (
                                    <div
                                        key={f.title}
                                        className="group rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-colors p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                                                {f.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-stone-900 text-sm">{f.title}</div>
                                                <div className="text-stone-600 text-sm leading-snug mt-1">{f.desc}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Proof */}
                            <div className="mt-5 grid grid-cols-3 gap-3">
                                <div className="rounded-xl border border-stone-200 bg-white p-3 text-center">
                                    <div className="text-lg font-serif text-stone-900">2 min</div>
                                    <div className="text-[11px] text-stone-500 mt-1">pour un montage</div>
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-white p-3 text-center">
                                    <div className="text-lg font-serif text-stone-900">HD</div>
                                    <div className="text-[11px] text-stone-500 mt-1">export propre</div>
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-white p-3 text-center">
                                    <div className="text-lg font-serif text-stone-900">∞</div>
                                    <div className="text-[11px] text-stone-500 mt-1">souvenirs</div>
                                </div>
                            </div>

                            <p className="mt-4 text-xs text-stone-500 leading-relaxed">
                                Objectif : vous faire passer de “j’ai une photo” à “j’ai un film” sans friction.
                                Moins d’options inutiles, plus d’impact visuel.
                            </p>
                        </div>
                    </div>

                    {/* Right: big screenshot + steps cards */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Big screenshot */}
                        <div className="relative">
                            <div className="absolute -inset-6 bg-gradient-to-tr from-rose-200/50 to-amber-200/50 blur-3xl opacity-50 rounded-[2.5rem]" />

                            <div className="relative rounded-[2rem] border border-stone-200 bg-white shadow-2xl">
                                <div className="h-11 bg-gradient-to-b from-stone-50 to-white border-b border-stone-100 flex items-center px-4 gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-300" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                                    <div className="ml-3 h-2.5 w-28 rounded bg-stone-100" />
                                    <div className="ml-auto text-[11px] text-stone-500 font-mono">Studio</div>
                                </div>

                                <div className="relative">
                                    <img
                                        src={screenshotSrc}
                                        alt="Capture d’écran du studio : bibliothèque, timeline, génération IA, musique et export"
                                        className="w-full h-auto object-cover"
                                        loading="lazy"
                                    />

                                    {/* Overlays (hotspots on large screens) */}
                                    <div className="hidden md:block pointer-events-none absolute left-0 top-0 w-full h-full">
                                        <Hotspot
                                            className="left-[21%] top-[21.5%]"
                                            title="Bibliothèque"
                                            desc="Thumbnails + recherche"
                                        />
                                        <Hotspot
                                            className="left-[23%] top-[70%]"
                                            title="IA Vidéo"
                                            desc="Prompt + durée"
                                        />
                                        <Hotspot
                                            className="left-[50%] top-[50%]"
                                            title="Timeline"
                                            desc="Drag & drop"
                                        />
                                        <Hotspot
                                            className="right-[5%] top-[7.5%]"
                                            title="Musique"
                                            desc="Sélectionner votre musique"
                                            align="right"
                                            position="top-right"
                                        />
                                        <Hotspot
                                            className="-right-[11%] top-[7.5%] z-1000"
                                            title="Export"
                                            desc="HD en 1 clic"
                                            align="right"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-stone-600">
                                    <span className="font-bold text-stone-900">Astuce :</span> commencez avec une photo,
                                    laissez le studio vous guider jusqu’au rendu final.
                                </div>

                                <button
                                    onClick={onPrimaryCta}
                                    className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-200 transition-all"
                                >
                                    Démarrer maintenant
                                </button>
                            </div>
                        </div>

                        {/* 3 Steps with screenshots */}
                        <div className="grid md:grid-cols-3 gap-4">
                            {STEPS.map((s) => {
                                const tone = toneClasses(s.tone);
                                const stepShot =
                                    s.screenshotKey === "step1"
                                        ? stepScreens.step1
                                        : s.screenshotKey === "step2"
                                            ? stepScreens.step2
                                            : stepScreens.step3;

                                return (
                                    <div
                                        key={s.k}
                                        className="group relative rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden hover:-translate-y-0.5 transition-all"
                                    >
                                        {/* soft glow */}
                                        <div
                                            className={[
                                                "pointer-events-none absolute -inset-10 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl",
                                                `bg-gradient-to-tr ${tone.glow}`,
                                            ].join(" ")}
                                        />

                                        {/* screenshot */}
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                                            <img
                                                src={stepShot}
                                                alt={`${s.title} - capture`}
                                                className="w-full h-[170px] object-cover"
                                                loading="lazy"
                                            />
                                            <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-700/50 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                                                <span className={`h-2 w-2 rounded-full ${tone.badge}`} />
                                                Étape {s.k} • {s.badge}
                                            </div>
                                        </div>

                                        {/* content */}
                                        <div className="relative p-4">
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={[
                                                        "mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center border",
                                                        tone.iconWrap,
                                                    ].join(" ")}
                                                >
                                                    {s.icon}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="font-bold text-stone-900 text-sm leading-snug">{s.title}</div>
                                                    <div className="text-stone-600 text-sm leading-snug mt-1">{s.desc}</div>
                                                </div>
                                            </div>

                                            {/* micro reassurance */}
                                            <div className="mt-4 flex items-center justify-between">
                                                <div className="text-[11px] text-stone-500">
                                                    Simple • Guidé •{" "}
                                                    <span className="text-stone-700 font-semibold">impact émotion</span>
                                                </div>
                                                <div className={["h-7 w-7 rounded-xl ring-2 bg-white/80 border border-stone-200", tone.ring].join(" ")} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Mobile: tiny helper text */}
                        <div className="md:hidden rounded-2xl border border-stone-200 bg-white/70 backdrop-blur p-5">
                            <div className="text-sm font-bold text-stone-900 mb-2">Le parcours en 3 étapes</div>
                            <ul className="space-y-2 text-sm text-stone-600">
                                <li className="flex items-start gap-2">
                                    <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
                                    Déposez vos photos et laissez l’album se structurer.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                                    Organisez le récit avec une timeline ultra intuitive.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    Partagez en famille : un film qui rassemble.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Hotspot({
                     className,
                     title,
                     desc,
                     align = "left",
    position = "top-left"
                 }: {
    className: string;
    title: string;
    desc: string;
    align?: "left" | "right";
    position?: "top-right" | "top-left"
}) {
    return (
        <div className={`absolute ${className}`}>
            <div className={`relative ${align === "right" ? "text-right" : "text-left"}`}>
                <div className={"absolute  h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_0_6px_rgba(244,63,94,0.18)] " + (position === 'top-left' ? '-left-2 -top-2' : '-right-2 -top-2')} />
                <div className="ml-4 rounded-xl border border-stone-200 bg-white/85 backdrop-blur px-3 py-2 shadow-md max-w-[180px]">
                    <div className="text-[11px] font-bold text-stone-900">{title}</div>
                    <div className="text-[11px] text-stone-600">{desc}</div>
                </div>
            </div>
        </div>
    );
}