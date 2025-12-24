import React from "react";
import {Heart} from "lucide-react";

type NavBarProps = {
    onLoginClick: () => void;
};

export default function NavBar({onLoginClick}: NavBarProps) {
    return (
        <nav className="relative z-50 px-6 py-6 max-w-7xl mx-auto flex justify-between items-center z-10">
            <a className="flex items-center gap-3" href="http://localhost:3000">
                <div
                    className="w-10 h-10 bg-gradient-to-br from-amber-400 to-rose-400 rounded-lg flex items-center justify-center text-white shadow-lg shadow-rose-200">
                    <Heart size={20} fill="currentColor"/>
                </div>
                <span className="font-serif text-2xl font-bold tracking-tight text-stone-900">Lifee</span>
            </a>

            <div className="hidden md:flex gap-8 text-sm font-medium text-stone-500">
                <a href="#fonctionnement" className="hover:text-rose-600 transition-colors">Le Studio</a>
                <a href="#temoignages" className="hover:text-rose-600 transition-colors">Histoires</a>
                <a href="#tarifs" className="hover:text-rose-600 transition-colors">Offres</a>
            </div>

            <button
                onClick={() => onLoginClick()}
                className="px-6 py-2.5 rounded-full bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 transition-all shadow-md hover:shadow-lg text-sm flex items-center gap-2"
            >
                Connexion <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full font-bold">+5</span>
            </button>
        </nav>
    );
}
