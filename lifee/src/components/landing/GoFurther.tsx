import {BookOpen, ArrowRight, ShieldCheck} from 'lucide-react';
export default function GoFurther() {
    return (
    <section className="relative overflow-hidden border-t border-amber-100 bg-gradient-to-b from-amber-50 via-white to-amber-50 py-20">
        {/* Décor */}
        <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl" />
            <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-rose-200/25 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-xs font-bold text-amber-800 shadow-sm backdrop-blur">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Aller plus loin • Histoire familiale
                </div>

                <h2 className="text-3xl md:text-4xl font-serif text-stone-900 leading-tight">
                    Envie d’aller plus loin dans votre histoire ?
                </h2>

                <p className="mt-4 text-stone-600 text-lg leading-relaxed">
                    Vous venez d’animer un souvenir.
                    <span className="text-stone-500">
          {" "}
                        Et si vous reconstituiez l’histoire complète derrière ces visages ?
        </span>
                    <br className="hidden sm:block" />
                    Avec notre partenaire, remontez votre lignée et construisez un arbre généalogique fiable, documenté, transmissible.
                </p>
            </div>

            <div className="mt-10 grid lg:grid-cols-12 gap-6 items-stretch">
                {/* Card principale */}
                <div className="lg:col-span-8">
                    <div className="relative rounded-3xl border border-amber-200/60 bg-white/80 backdrop-blur shadow-[0_22px_60px_-40px_rgba(2,6,23,0.25)] overflow-hidden">
                        <div className="absolute -inset-10 bg-gradient-to-tr from-amber-200/30 to-rose-200/20 blur-3xl" />

                        <div className="relative p-6 sm:p-8">
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 h-12 w-12 rounded-2xl border border-amber-200 bg-amber-50 flex items-center justify-center shadow-sm">
                                    <BookOpen size={20} className="text-amber-700" />
                                </div>

                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-stone-900">
                                        OP Généalogies — Recherche généalogique professionnelle
                                    </div>
                                    <div className="mt-1 text-sm text-stone-600 leading-relaxed">
                                        Démarrez avec quelques noms, dates ou documents… puis laissez un pro remonter les générations,
                                        vérifier les sources et vous livrer un arbre clair (et une histoire racontable).
                                    </div>

                                    {/* Points forts */}
                                    <div className="mt-5 grid sm:grid-cols-3 gap-3">
                                        <div className="rounded-2xl border border-stone-200 bg-white p-4">
                                            <div className="text-xs font-bold text-stone-900">Arbre complet</div>
                                            <div className="mt-1 text-xs text-stone-500">Structuré, lisible, transmissible</div>
                                        </div>
                                        <div className="rounded-2xl border border-stone-200 bg-white p-4">
                                            <div className="text-xs font-bold text-stone-900">Sources vérifiées</div>
                                            <div className="mt-1 text-xs text-stone-500">Archives & documents à l’appui</div>
                                        </div>
                                        <div className="rounded-2xl border border-stone-200 bg-white p-4">
                                            <div className="text-xs font-bold text-stone-900">Récit de famille</div>
                                            <div className="mt-1 text-xs text-stone-500">Mettre du sens derrière les photos</div>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
                                        <a
                                            href="https://op-genealogies.fr?from=lifee"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl font-bold text-white shadow-lg shadow-amber-200/60 transition-all hover:-translate-y-0.5"
                                            style={{
                                                backgroundImage:
                                                    "linear-gradient(90deg, rgba(245,158,11,0.95), rgba(251,113,133,0.85))",
                                            }}
                                        >
                                            Découvrir OP Généalogies <ArrowRight size={18} />
                                        </a>

                                        <div className="text-xs text-stone-500">
                                            <span className="font-bold text-stone-700">Conseil :</span> commencez par 3 informations (nom, lieu, date)
                                            — le reste se reconstruit.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Col droite : preuve / rassurance */}
                <div className="lg:col-span-4">
                    <div className="rounded-3xl border border-stone-200 bg-white/70 backdrop-blur p-6 shadow-sm h-full">
                        <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
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

                        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                            <div className="text-xs font-bold text-amber-900">Petit “wow”</div>
                            <div className="mt-1 text-xs text-amber-900/80">
                                Votre film devient un héritage : des images + une histoire + une lignée.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    );}