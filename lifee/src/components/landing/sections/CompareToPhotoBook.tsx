import React from "react";
import {ArrowRight, Film, BookOpen, Share2, Volume2, ShieldCheck} from "lucide-react";

type Props = {
    onPrimaryCta?: () => void;
};

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function Item({icon, title, desc}: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="flex items-start gap-3">
            <div
                className="mt-0.5 h-9 w-9 rounded-2xl border border-stone-200 bg-white flex items-center justify-center shadow-sm">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-sm font-bold text-stone-900">{title}</div>
                <div className="mt-1 text-sm text-stone-600 leading-snug">{desc}</div>
            </div>
        </div>
    );
}

export default function CompareToPhotoBook({onPrimaryCta}: Readonly<Props>) {
    return (
        <section
            id="difference"
            className="relative overflow-hidden border-t border-stone-200 bg-gradient-to-b from-white via-stone-50 to-white py-20 scroll-mt-20"
        >
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-28 -left-28 h-96 w-96 rounded-full bg-rose-200/30 blur-3xl"/>
                <div className="absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl"/>
                <div
                    className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>
            </div>

            <div className="relative mx-auto max-w-7xl px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <div
                        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600 shadow-sm backdrop-blur">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400"/>
                        Ce qu’un livre ne peut pas faire
                    </div>

                    <h2 className="mt-5 text-3xl md:text-5xl font-serif text-stone-900 leading-tight">
                        Le livre garde l’image.
                        <span
                            className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500 italic">
              {" "}
                            Lifee garde le moment.
            </span>
                    </h2>

                    <p className="mt-4 text-lg text-stone-600 leading-relaxed">
                        Le but n’est pas de “produire du contenu”. C’est de rendre un souvenir
                        <span className="text-stone-500"> vivant, partageable, et transmissible.</span>
                    </p>
                </div>

                <div className="mt-12 grid lg:grid-cols-2 gap-6 items-stretch">
                    {/* LEFT: Photo book */}
                    <div
                        className="relative overflow-hidden rounded-3xl border border-stone-200 bg-white/80 backdrop-blur shadow-sm">
                        <div className="absolute -inset-10 bg-gradient-to-tr from-stone-200/30 to-white/0 blur-3xl"/>
                        <div className="relative p-7">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="h-12 w-12 rounded-2xl border border-stone-200 bg-white flex items-center justify-center">
                                        <BookOpen className="h-5 w-5 text-stone-700"/>
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-stone-900">Livre photo</div>
                                        <div className="text-xs text-stone-500">objet • statique • intime</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <Item icon={<Film className="h-4 w-4 text-stone-400"/>} title="Image figée"
                                      desc="On voit, mais on ne ressent pas la scène."/>
                                <Item icon={<Volume2 className="h-4 w-4 text-stone-400"/>} title="Silence"
                                      desc="Pas de voix, pas de souffle, pas de rythme."/>
                                <Item icon={<Share2 className="h-4 w-4 text-stone-400"/>} title="Partage limité"
                                      desc="Se feuillette sur place, rarement ensemble à distance."/>
                            </div>

                            <div
                                className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                                <span className="font-bold text-stone-900">Très bien</span> pour conserver.
                                <br/>
                                <span className="text-stone-500">Moins bien</span> pour revivre.
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Lifee */}
                    <div
                        className="relative overflow-hidden rounded-3xl border border-rose-200/70 bg-white/80 backdrop-blur shadow-[0_30px_120px_-80px_rgba(244,63,94,0.25)]">
                        <div
                            className="absolute -inset-10 bg-gradient-to-tr from-rose-200/40 via-amber-200/25 to-white/0 blur-3xl"/>
                        <div className="relative p-7">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="h-12 w-12 rounded-2xl border border-rose-200/70 bg-rose-50 flex items-center justify-center">
                                        <Film className="h-5 w-5 text-rose-700"/>
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-stone-900">Film Lifee</div>
                                        <div className="text-xs text-stone-500">vivant • cinématique • transmissible
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="hidden sm:inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600">
                                    <ShieldCheck className="h-3.5 w-3.5 text-stone-500"/>
                                    Partage privé
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <Item icon={<Film className="h-4 w-4 text-rose-600"/>} title="Mouvement subtil"
                                      desc="On retrouve une présence, sans effet “gadget”."/>
                                <Item icon={<Volume2 className="h-4 w-4 text-amber-600"/>} title="Rythme & musique"
                                      desc="La scène prend une respiration."/>
                                <Item icon={<Share2 className="h-4 w-4 text-emerald-600"/>}
                                      title="Un lien, rien de public" desc="Famille seulement. Sans réseaux sociaux."/>
                            </div>

                            <div className="mt-7 flex flex-col sm:flex-row items-center gap-3">
                                <button
                                    onClick={onPrimaryCta}
                                    className={cx(
                                        "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4",
                                        "bg-stone-900 hover:bg-stone-800 text-white font-black shadow-lg transition"
                                    )}
                                >
                                    Créer mon film <ArrowRight className="h-4 w-4"/>
                                </button>

                                <div className="text-xs text-stone-500">
                                    En 3 étapes : déposer → organiser → exporter.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
