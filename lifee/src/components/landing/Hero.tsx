import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import InteractiveDemo from "./InteractiveDemo";

type HeroProps = {
    onDownloadClick: () => void;
};

export default function Hero({ onDownloadClick }: Readonly<HeroProps>) {
    return (
        <header className="relative z-10 pt-16 pb-32 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            {/* Copywriting (new mixed style) */}
            <div className="space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-1000">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/50 border border-amber-200 text-amber-800 text-xs font-bold tracking-wide uppercase">
                    <Sparkles size={12} /> Nouvelle technologie de restauration
                </div>

                <h1 className="text-5xl md:text-7xl font-serif font-medium leading-[1.1] text-stone-900">
                    Ne laissez pas <br />
                    vos souvenirs <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500 italic pr-2 animate-gradient">
            s&apos;effacer.
          </span>
                </h1>

                <p className="text-xl text-stone-500 max-w-lg leading-relaxed font-light">
                    Transformez vos albums photos poussiéreux en films cinématiques grâce à notre IA. Une frise de vie éternelle à
                    transmettre aux générations futures.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                        onClick={onDownloadClick}
                        className="px-8 py-4 bg-rose-600 text-white text-lg font-medium rounded-xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 flex items-center justify-center gap-2 hover:-translate-y-1"
                    >
                        Commencer mon album <ArrowRight size={20} />
                    </button>

                    <div className="flex items-center gap-3 px-4 text-sm text-stone-500">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                                <img
                                    key={i}
                                    src={`https://i.pravatar.cc/100?img=${i + 10}`}
                                    alt="user"
                                    className="w-8 h-8 rounded-full border-2 border-stone-50"
                                />
                            ))}
                        </div>
                        <span>Déjà 12 000 souvenirs sauvés</span>
                    </div>
                </div>
            </div>

            {/* Interactive demo (kept) */}
            <InteractiveDemo onDownloadClick={onDownloadClick} />
        </header>
    );
}
