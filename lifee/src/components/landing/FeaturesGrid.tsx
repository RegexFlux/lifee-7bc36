import React from "react";
import { Clock, Move, Sparkles } from "lucide-react";

type Feature = {
    icon: any;
    title: string;
    desc: string;
};

export default function FeaturesGrid() {
    const features: Feature[] = [
        { icon: <Move size={24} />, title: "Parallax 3D", desc: "Créez de la profondeur instantanément à partir d'une image plate." },
        { icon: <Sparkles size={24} />, title: "Particules & FX", desc: "Ajoutez de la fumée, de la pluie ou des lumières volumétriques." },
        { icon: <Clock size={24} />, title: "Timeline Pro", desc: "Contrôlez chaque seconde de votre animation avec précision." },
    ];

    return (
        <section className="py-24 relative">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Une suite créative complète</h2>
                    <p className="text-slate-400">Tout ce dont vous avez besoin pour sublimer vos contenus.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feat, i) => (
                        <div key={i} className="bg-white/5 border border-white/5 p-8 rounded-2xl hover:bg-white/10 transition-colors group cursor-default">
                            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                                {feat.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-100">{feat.title}</h3>
                            <p className="text-slate-400 leading-relaxed text-sm">{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
