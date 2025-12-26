// /components/landing/interactiveDemo/PolaroidStack.tsx
"use client";

import React from "react";

export default function PolaroidStack({src}: { src: string }) {
    return (
        <div
            className="relative w-36 h-44 transform -rotate-6 transition-transform group-hover:-rotate-12 duration-500">
            <div
                className="absolute inset-0 bg-slate-200 p-2 pb-8 shadow-2xl rounded transform -rotate-12 border border-slate-400">
                <div className="w-full h-full bg-slate-300 overflow-hidden">
                    <img src={src} className="w-full h-full object-cover opacity-80 mix-blend-multiply"
                         alt="polaroid1"/>
                </div>
            </div>

            <div
                className="absolute inset-0 bg-slate-100 p-2 pb-8 shadow-2xl rounded transform -rotate-6 border border-slate-400">
                <div className="w-full h-full bg-slate-300 overflow-hidden">
                    <img src={src} className="w-full h-full object-cover opacity-80 mix-blend-multiply"
                         alt="polaroid2"/>
                </div>
            </div>

            <div
                className="absolute inset-0 z-40 bg-white p-2 pb-8 shadow-2xl rounded transform rotate-3 border border-slate-300">
                <div className="w-full h-full bg-slate-800 overflow-hidden mb-1">
                    <img src={src} className="w-full h-full object-cover" alt="polaroid3"/>
                </div>
                <div className="h-1.5 w-16 bg-slate-200 rounded-full mx-auto"/>
            </div>

            <div
                className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-xs font-handwriting text-slate-400 whitespace-nowrap">
                Vos Photos
            </div>
        </div>
    );
}
