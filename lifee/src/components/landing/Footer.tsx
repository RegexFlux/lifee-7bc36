import React from "react";
import { Github, Linkedin, Twitter } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-white/5 bg-black py-12 text-slate-500 text-sm">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2 font-bold text-white">
                    <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center">L</div>
                    Lifee.
                </div>

                <div className="flex gap-6">
                    <a href="#" className="hover:text-white">Mentions Légales</a>
                    <a href="#" className="hover:text-white">Confidentialité</a>
                    <a href="#" className="hover:text-white">Support</a>
                </div>

                <div className="flex gap-4">
                    <Twitter size={18} className="hover:text-white cursor-pointer" />
                    <Linkedin size={18} className="hover:text-white cursor-pointer" />
                    <Github size={18} className="hover:text-white cursor-pointer" />
                </div>
            </div>
        </footer>
    );
}
