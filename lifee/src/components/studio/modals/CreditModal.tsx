"use client";

import React from "react";
import { Loader2, ShieldCheck, Sparkles, X } from "lucide-react";

export function CreditModal(props: {
    open: boolean;
    credits: number;
    purchasing: boolean;
    onClose: () => void;
    onPurchase: (amount: number) => void;
}) {
    if (!props.open) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles size={80} />
                    </div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">Recharger</h3>
                            <p className="text-amber-100 text-sm mt-1">
                                Solde actuel:{" "}
                                <span className="font-bold bg-white/20 px-2 py-0.5 rounded-lg">
                  {props.credits}
                </span>
                            </p>
                        </div>
                        <button
                            onClick={props.onClose}
                            className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors"
                            aria-label="Fermer"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-5 space-y-4 bg-slate-50">
                    <button
                        onClick={() => props.onPurchase(20)}
                        disabled={props.purchasing}
                        className="w-full relative group bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-amber-400 hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                20
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-slate-800">Pack Découverte</div>
                                <div className="text-xs text-slate-500 font-medium">0.75€ / vidéo</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-slate-800">15€</div>
                        </div>
                    </button>

                    <button
                        onClick={() => props.onPurchase(50)}
                        disabled={props.purchasing}
                        className="w-full relative group bg-white border-2 border-amber-400 rounded-xl p-4 flex justify-between items-center shadow-lg shadow-amber-100 hover:shadow-amber-200 transition-all active:scale-[0.98] overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                            ÉCONOMISEZ 33%
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-sm relative">
                                <Sparkles size={16} className="absolute animate-ping opacity-75" />
                                50
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-slate-900">Pack Créateur</div>
                                <div className="text-xs text-amber-600 font-bold">0.50€ / vidéo</div>
                            </div>
                        </div>

                        <div className="text-right mt-3">
                            <div className="text-xl font-black text-slate-800">25€</div>
                        </div>
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 pt-2">
                        <ShieldCheck size={12} /> Paiement 100% sécurisé (SSL)
                    </div>
                </div>

                {props.purchasing && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-2" />
                        <p className="text-sm font-bold text-slate-600">Validation...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
