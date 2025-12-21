import React from "react";
import { ArrowRight, Play, Zap } from "lucide-react";
import InteractiveDemo from "./InteractiveDemo";

type HeroProps = {
    onDownloadClick: () => void;
};

export default function Hero({ onDownloadClick }: Readonly<HeroProps>) {
    return (
        <header className="relative z-10 pt-20 pb-32 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-1000 relative z-30">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold tracking-wide uppercase">
                    <Zap size={12} fill="currentColor" /> Nouvelle Version 2.0
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
                    Donnez vie <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 animate-gradient">
            à l&apos;immobile.
          </span>
                </h1>

                <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                    L&apos;IA générative cinématique pour vos photos. Transformez instantanément vos assets statiques en vidéos captivantes pour le e-commerce et le luxe.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                        onClick={() => document.getElementById("demo-area")?.scrollIntoView({ behavior: "smooth" })}
                        className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
                    >
                        Essayer Gratuitement <ArrowRight size={18} />
                    </button>

                    <button className="px-8 py-4 bg-transparent border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                        <Play size={18} fill="currentColor" /> Voir la démo
                    </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 pt-8">
                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950" />
                        ))}
                    </div>
                    <p>Utilisé par +10,000 créateurs</p>
                </div>
            </div>

            <InteractiveDemo onDownloadClick={onDownloadClick} />
        </header>
    );
}
