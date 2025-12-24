"use client";

import React, { useMemo } from "react";
import { BookOpen, ArrowRight, ShieldCheck, Sparkles, Quote, CheckCircle2 } from "lucide-react";

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

export default function GoFurther() {
    const href = useMemo(() => "https://op-genealogies.fr?from=lifee", []);

    return (
        <section className="relative overflow-hidden border-t border-amber-100 bg-gradient-to-b from-amber-50 via-white to-amber-50 py-20">
            {/* Ultra premium backdrop: aurora + grain + vignette */}
            <div className="pointer-events-none absolute inset-0">
                {/* Big glows */}
                <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-amber-200/35 blur-3xl" />
                <div className="absolute -bottom-28 -right-28 h-[26rem] w-[26rem] rounded-full bg-rose-200/25 blur-3xl" />
                <div className="absolute left-[55%] top-[-20%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-emerald-200/18 blur-3xl" />

                {/* Aurora ribbons (pure CSS, no deps) */}
                <div className="absolute inset-0 opacity-[0.55]">
                    <div className="absolute left-[-15%] top-[10%] h-64 w-[70%] rotate-[8deg] rounded-[999px] bg-[linear-gradient(90deg,rgba(251,191,36,0.0),rgba(251,191,36,0.22),rgba(244,114,182,0.18),rgba(16,185,129,0.14),rgba(251,191,36,0.0))] blur-2xl animate-[lifeeAurora_9s_ease-in-out_infinite]" />
                    <div className="absolute right-[-10%] top-[45%] h-64 w-[65%] -rotate-[10deg] rounded-[999px] bg-[linear-gradient(90deg,rgba(244,114,182,0.0),rgba(244,114,182,0.20),rgba(251,191,36,0.20),rgba(16,185,129,0.12),rgba(244,114,182,0.0))] blur-2xl animate-[lifeeAurora_12s_ease-in-out_infinite]" />
                </div>

                {/* Fine grain */}
                <div className="absolute inset-0 opacity-[0.065] [background-image:url('https://grainy-gradients.vercel.app/noise.svg')]" />

                {/* Soft vignette for depth */}
                <div className="absolute inset-0 bg-[radial-gradient(1100px_560px_at_50%_10%,rgba(255,255,255,0.55),transparent_60%),radial-gradient(1200px_800px_at_50%_55%,transparent_55%,rgba(2,6,23,0.10)_100%)]" />
            </div>

            <div className="relative mx-auto max-w-6xl px-6">
                {/* Header */}
                <div className="mx-auto max-w-3xl text-center">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-white/70 px-3 py-1 text-xs font-bold text-amber-900 shadow-sm backdrop-blur">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Aller plus loin • Histoire familiale
                        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-900">
              <Sparkles className="h-3 w-3" />
              Recommandé
            </span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-serif text-stone-900 leading-tight">
                        Envie d’aller plus loin dans votre histoire&nbsp;?
                    </h2>

                    <p className="mt-4 text-stone-600 text-lg leading-relaxed">
                        Vous venez d’animer un souvenir.
                        <span className="text-stone-500"> Et si vous reconstituiez l’histoire complète derrière ces visages&nbsp;?</span>
                        <br className="hidden sm:block" />
                        Avec notre partenaire, remontez votre lignée et construisez un arbre généalogique fiable, documenté, transmissible.
                    </p>
                </div>

                <div className="mt-12 grid lg:grid-cols-12 gap-6 items-stretch">
                    {/* Main feature card */}
                    <div className="lg:col-span-8">
                        <div className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-white/75 backdrop-blur-xl shadow-[0_30px_120px_-60px_rgba(2,6,23,0.35)]">
                            {/* inner glow */}
                            <div className="absolute -inset-10 bg-gradient-to-tr from-amber-200/35 via-rose-200/20 to-emerald-200/15 blur-3xl" />

                            {/* subtle stroke */}
                            <div className="absolute inset-0 rounded-3xl ring-1 ring-white/40" />

                            <div className="relative p-6 sm:p-8">
                                <div className="flex items-start gap-4">
                                    <div className="shrink-0">
                                        <div className="relative h-12 w-12 rounded-2xl border border-amber-200/80 bg-amber-50 flex items-center justify-center shadow-sm">
                                            <BookOpen size={20} className="text-amber-800" />
                                            <span className="absolute -inset-3 rounded-[18px] bg-amber-200/25 blur-xl" aria-hidden="true" />
                                        </div>
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-sm font-black tracking-tight text-stone-900">
                                                OP Généalogies — Recherche généalogique professionnelle
                                            </div>
                                            <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white/80 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                        <ShieldCheck className="h-3 w-3" />
                        Sources vérifiées
                      </span>
                                        </div>

                                        <div className="mt-2 text-sm text-stone-600 leading-relaxed">
                                            Démarrez avec quelques noms, dates ou documents… puis laissez un pro remonter les générations,
                                            vérifier les sources et vous livrer un arbre clair <span className="text-stone-500">(et une histoire racontable)</span>.
                                        </div>

                                        {/* Feature bullets (more premium) */}
                                        <div className="mt-6 grid sm:grid-cols-3 gap-3">
                                            {[
                                                { t: "Arbre complet", d: "Structuré, lisible, transmissible" },
                                                { t: "Sources vérifiées", d: "Archives & documents à l’appui" },
                                                { t: "Récit de famille", d: "Donner du sens aux photos" },
                                            ].map((x) => (
                                                <div
                                                    key={x.t}
                                                    className="group rounded-2xl border border-stone-200/80 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className="mt-0.5 grid h-6 w-6 place-items-center rounded-xl bg-stone-900 text-white">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-black text-stone-900">{x.t}</div>
                                                            <div className="mt-1 text-xs text-stone-500">{x.d}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Testimonial micro-quote (adds trust) */}
                                        <div className="mt-6 rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-2xl bg-white/80 border border-amber-200/70">
                                                    <Quote className="h-4 w-4 text-amber-900/80" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-amber-950">Le “vrai plus”</div>
                                                    <div className="mt-1 text-xs text-amber-900/80 leading-relaxed">
                                                        Transformer une émotion en héritage&nbsp;: des images, des sources, et une histoire transmissible.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* CTA row: primary + secondary link */}
                                        <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={cx(
                                                    "group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl font-black text-white",
                                                    "shadow-lg shadow-amber-200/60 transition-all active:scale-[0.99]",
                                                    "hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                                                )}
                                                style={{
                                                    backgroundImage:
                                                        "linear-gradient(90deg, rgba(245,158,11,0.95), rgba(251,113,133,0.85))",
                                                }}
                                            >
                                                Découvrir OP Généalogies
                                                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                                />
                                            </a>

                                            <div className="text-xs text-stone-500">
                                                <span className="font-black text-stone-700">Conseil :</span> commencez par 3 infos (nom, lieu, date) — le reste se reconstruit.
                                            </div>
                                        </div>

                                        {/* tiny legal / transparency */}
                                        <div className="mt-4 text-[11px] text-stone-400">
                                            Redirection vers un partenaire externe. Vous restez libre de poursuivre ou non la démarche.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right reassurance card */}
                    <div className="lg:col-span-4 h-max">
                        <div className="relative h-full overflow-hidden rounded-3xl border border-stone-200 bg-white/70 backdrop-blur p-6 shadow-sm">
                            <div className="absolute -inset-10 bg-[radial-gradient(500px_circle_at_20%_0%,rgba(251,191,36,0.16),transparent_60%),radial-gradient(560px_circle_at_100%_100%,rgba(244,114,182,0.12),transparent_60%)]" />

                            <div className="relative">
                                <div className="flex items-center gap-2 text-sm font-black text-stone-900">
                                    <ShieldCheck size={16} className="text-stone-700" />
                                    Pour une démarche sereine
                                </div>

                                <ul className="mt-4 space-y-3 text-sm text-stone-600">
                                    <li className="flex items-start gap-2">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                        Vous gardez la main : vous choisissez les informations partagées.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
                                        Résultat clair : arbre + étapes de recherche + sources.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                        Idéal après l’animation : donner un contexte aux souvenirs.
                                    </li>
                                </ul>

                                {/* Small “wow” block turned into a premium badge */}
                                <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-2xl border border-amber-200/70 bg-white/80">
                                            <Sparkles className="h-4 w-4 text-amber-900/80" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-black text-amber-950">Une vraie direction</div>
                                            <div className="mt-1 text-xs text-amber-900/80 leading-relaxed">
                                                Votre film devient un héritage&nbsp;: images + histoire + lignée.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Secondary action: "En savoir plus" without creating another strong CTA */}
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-5 inline-flex items-center gap-2 text-xs font-black text-stone-800 hover:text-stone-950"
                                >
                                    Voir les détails
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
        @keyframes lifeeAurora {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.65;
          }
          50% {
            transform: translate3d(6%, -4%, 0) scale(1.06);
            opacity: 0.85;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.65;
          }
        }
      `}</style>
        </section>
    );
}
