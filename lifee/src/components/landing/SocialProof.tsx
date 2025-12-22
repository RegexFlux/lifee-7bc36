import {Star} from 'lucide-react';
export default function SocialProof() {
    return (
    <section id="temoignages" className="py-24 bg-rose-50/99">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-3xl font-serif mb-8 text-stone-900">Ils ont sauvé leur patrimoine</h2>
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-100">
                            <div className="flex gap-1 text-amber-400 mb-3"><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/></div>
                            <p className="text-stone-600 italic mb-4">"J'ai pleuré en voyant la photo de mon mariage s'animer. C'était comme si j'y étais à nouveau. Un cadeau inestimable pour mes enfants."</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-stone-200 rounded-full"></div>
                                <div>
                                    <div className="font-bold text-sm">Sophie M.</div>
                                    <div className="text-xs text-stone-400">Utilisatrice Héritage</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-100 opacity-80 scale-95 origin-left">
                            <div className="flex gap-1 text-amber-400 mb-3"><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/></div>
                            <p className="text-stone-600 italic mb-4">"La simplicité est bluffante. J'ai pu scanner et animer tout l'album de 1990 en une après-midi."</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-stone-200 rounded-full"></div>
                                <div>
                                    <div className="font-bold text-sm">Marc D.</div>
                                    <div className="text-xs text-stone-400">Utilisateur Découverte</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-2xl text-center shadow-lg shadow-rose-100">
                        <div className="text-4xl font-serif font-bold text-rose-500 mb-2">12k+</div>
                        <div className="text-stone-500 text-sm">Souvenirs animés</div>
                    </div>
                    <div className="bg-white p-8 rounded-2xl text-center shadow-lg shadow-amber-100 mt-8">
                        <div className="text-4xl font-serif font-bold text-amber-500 mb-2">4.9/5</div>
                        <div className="text-stone-500 text-sm">Note moyenne</div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    );
}