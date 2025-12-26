// src/components/studio/welcome/WelcomeLayout.tsx
"use client";
import React from "react";
import dynamic from "next/dynamic";
import {StarDustRain} from "@/components/animations/StarDustRain";

const FXBackdrop = dynamic(() => import("@/components/animations/fx/FXBackdrop"), {ssr: false});

export default function WelcomeLayout({children}: { children: React.ReactNode }) {
    return (
        <div
            className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50 text-stone-900 relative overflow-hidden">
            <FXBackdrop/>
            <StarDustRain/>

            {/* decor */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl"/>
                <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl"/>
                <div
                    className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>
            </div>

            {children}
        </div>
    );
}
