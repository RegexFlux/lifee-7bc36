import {Upload, Wand2, Share2} from 'lucide-react';
export default function HowItWorks() {
    return (
    <section id="fonctionnement" className="py-24 bg-stone-50 border-y border-stone-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-4">Le Studio Temporel</h2>
                <p className="text-stone-500 text-lg">
                    Pas besoin de compétences techniques. Vous êtes le réalisateur de votre histoire, nous nous occupons de la magie.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {[
                    {
                        step: "01", title: "Importez",
                        desc: "Glissez vos photos sur l'année de votre choix dans la frise chronologique.",
                        icon: <Upload className="text-stone-600" />
                    },
                    {
                        step: "02", title: "Laissez l'IA agir",
                        desc: "Notre IA contextuelle comprend la scène et l'anime subtilement (vent, lumière).",
                        icon: <Wand2 className="text-rose-600" />
                    },
                    {
                        step: "03", title: "Partagez",
                        desc: "Exportez votre film de vie ou invitez vos proches à collaborer.",
                        icon: <Share2 className="text-amber-600" />
                    }
                ].map((card, i) => (
                    <div key={i} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-stone-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-serif text-6xl font-bold text-stone-300 group-hover:text-rose-200 transition-colors">
                            {card.step}
                        </div>
                        <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center mb-6">
                            {card.icon}
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-stone-800">{card.title}</h3>
                        <p className="text-stone-500 leading-relaxed text-sm">{card.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
    );
}