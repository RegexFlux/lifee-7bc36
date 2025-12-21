import React from "react";
import { ArrowRight, Lock, X } from "lucide-react";

type AuthModalProps = {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
    setUserEmail: React.Dispatch<React.SetStateAction<string>>;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function AuthModal({
                                      isOpen,
                                      onClose,
                                      userEmail,
                                      setUserEmail,
                                      onSubmit,
                                  }: AuthModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-slate-900 border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                        <Lock size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Sauvegarder votre création</h3>
                    <p className="text-slate-400 text-sm">Entrez votre email pour télécharger votre vidéo HD et accéder au studio complet.</p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Professionnel</label>
                        <input
                            type="email"
                            required
                            placeholder="nom@entreprise.com"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                    >
                        Accéder au téléchargement <ArrowRight size={18} />
                    </button>

                    <p className="text-center text-xs text-slate-600 pt-2">Pas de carte de crédit requise. 7 jours d&apos;essai gratuit inclus.</p>
                </form>
            </div>
        </div>
    );
}
