import React from "react";
import {ArrowRight, HeartHandshake, PartyPopper, Baby, Flower2, ShieldCheck} from "lucide-react";

type Props = { onPrimaryCta?: () => void };

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

const ITEMS = [
    {
        icon: <Flower2 className="h-4 w-4"/>,
        title: "Mariage",
        desc: "Revivez un instant précis, sans le dénaturer.",
        tone: "rose",
    },
    {
        icon: <HeartHandshake className="h-4 w-4"/>,
        title: "Hommage",
        desc: "Un rendu doux et respectueux. Un film qui rassemble.",
        tone: "amber",
    },
    {
        icon: <PartyPopper className="h-4 w-4"/>,
        title: "Anniversaire",
        desc: "Offrir une émotion, pas un objet de plus.",
        tone: "emerald",
    },
    {
        icon: <Baby className="h-4 w-4"/>,
        title: "Enfance",
        desc: "Transformer des photos éparses en récit.",
        tone: "stone",
    },
] as const;

function tone(tone: (typeof ITEMS)[number]["tone"]) {
    if (tone === "rose")
        return {wrap: "bg-rose-50 border-rose-200/60 text-rose-700", glow: "from-rose-200/45 to-amber-200/10"};
    if (tone === "amber")
        return {wrap: "bg-amber-50 border-amber-200/60 text-amber-800", glow: "from-amber-200/45 to-rose-200/10"};
    if (tone === "emerald")
        return {
            wrap: "bg-emerald-50 border-emerald-200/60 text-emerald-800",
            glow: "from-emerald-200/35 to-amber-200/10"
        };
    return {wrap: "bg-stone-50 border-stone-200 text-stone-700", glow: "from-stone-200/35 to-white/0"};
}

export default function Occasions({onPrimaryCta}: Readonly<Props>) {
    return (
        <section id="occasions"
                 className="relative overflow-hidden border-t border-stone-200 bg-white py-20 scroll-mt-20">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 right-[10%] h-80 w-80 rounded-full bg-rose-200/25 blur-3xl"/>
                <div className="absolute -bottom-24 left-[10%] h-80 w-80 rounded-full bg-amber-200/25 blur-3xl"/>
                <div
                    className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>
            </div>

            <div className="relative mx-auto max-w-7xl px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <div
                        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600 shadow-sm backdrop-blur">
                        <ShieldCheck className="h-3.5 w-3.5 text-stone-500"/>
                        Déclencheurs d’usage (les moments où ça compte)
                    </div>
                    <h2 className="mt-5 text-3xl md:text-4xl font-serif text-stone-900 leading-tight">
                        Quand offrir un film de vie ?
                    </h2>
                    <p className="mt-4 text-lg text-stone-600 leading-relaxed">
                        Tu veux créer un <span className="text-stone-500">moment partagé</span>. Pas juste “archiver”.
                    </p>
                </div>

                <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {ITEMS.map((x) => {
                        const t = tone(x.tone);
                        return (
                            <div key={x.title}
                                 className="group relative overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm hover:-translate-y-0.5 transition-all">
                                <div
                                    className={cx("pointer-events-none absolute -inset-10 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl", `bg-gradient-to-tr ${t.glow}`)}/>
                                <div className="relative p-6">
                                    <div
                                        className={cx("h-10 w-10 rounded-2xl border flex items-center justify-center", t.wrap)}>
                                        {x.icon}
                                    </div>
                                    <div className="mt-4 text-sm font-black text-stone-900">{x.title}</div>
                                    <div className="mt-1 text-sm text-stone-600 leading-snug">{x.desc}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={onPrimaryCta}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 bg-stone-900 hover:bg-stone-800 text-white font-black shadow-lg transition"
                    >
                        Créer mon film <ArrowRight className="h-4 w-4"/>
                    </button>
                </div>
            </div>
        </section>
    );
}
