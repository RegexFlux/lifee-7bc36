import {Check} from 'lucide-react';

export default function Solution() {
    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
                <div className="relative">
                    <div
                        className="aspect-square bg-stone-100 rounded-full absolute -left-20 -top-20 w-96 h-96 opacity-50 mix-blend-multiply"></div>
                    <div
                        className="aspect-square bg-rose-50 rounded-full absolute -right-10 -bottom-10 w-72 h-72 opacity-50 mix-blend-multiply"></div>
                    <div className="relative z-10 bg-white p-8 rounded-2xl shadow-xl border border-stone-100 rotate-2">
                        <h3 className="font-serif text-2xl mb-4 text-stone-800">Le problème des albums oubliés</h3>
                        <p className="text-stone-500 leading-relaxed">
                            Vos albums photos sont des trésors, mais ils finissent souvent dans un placard, oubliés,
                            prenant la poussière et jaunissant avec le temps. L'émotion reste figée sur le papier.
                        </p>
                    </div>
                </div>
                <div>
                    <h2 className="text-4xl font-serif text-stone-900 mb-6">
                        Une mémoire <span className="italic text-rose-500">vivante</span>,<br/>partout avec vous.
                    </h2>
                    <p className="text-lg text-stone-600 mb-8">
                        Notre plateforme ne se contente pas de numériser. Elle réveille l'instant. Le vent dans les
                        cheveux, le scintillement de l'eau, un sourire qui s'anime...
                    </p>
                    <ul className="space-y-4">
                        {[
                            "Accessible depuis n'importe quel écran",
                            "Partage sécurisé avec la famille en un clic",
                            "Qualité améliorée (HD) et colorisation"
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-stone-700 font-medium">
                                <div
                                    className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                    <Check size={14}/>
                                </div>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>)
};