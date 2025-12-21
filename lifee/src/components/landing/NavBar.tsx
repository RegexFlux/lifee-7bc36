import React from "react";
import { Sparkles } from "lucide-react";

type NavBarProps = {
    onLoginClick: () => void;
};

export default function NavBar({ onLoginClick }: NavBarProps) {
    return (
        <nav className="relative z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
            <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
                <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Sparkles size={18} className="text-white fill-white" />
                </div>
                Lifee.
            </div>

            <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
                <a href="#" className="hover:text-white transition-colors">Features</a>
                <a href="#" className="hover:text-white transition-colors">Showcase</a>
                <a href="#" className="hover:text-white transition-colors">Pricing</a>
            </div>

            <button
                onClick={onLoginClick}
                className="px-5 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all text-sm font-medium"
            >
                Connexion
            </button>
        </nav>
    );
}
