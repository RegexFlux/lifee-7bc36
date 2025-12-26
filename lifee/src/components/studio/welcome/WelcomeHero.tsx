// src/components/studio/welcome/WelcomeHero.tsx
"use client";

import React from "react";
import {Sparkles, FolderPlus} from "lucide-react";
import {useT} from "@/lib/i18n/useT";

export function WelcomeHero() {
    const {t} = useT();

    return (
        <section className="rounded-3xl border border-stone-200 bg-white/70 shadow-sm backdrop-blur p-6 sm:p-7">
            <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                    <div
                        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600">
                        <Sparkles size={14} className="text-rose-600"/>
                        {t("studio.welcome.badge")}
                    </div>

                    <h1 className="mt-3 text-2xl sm:text-3xl font-serif text-stone-900">
                        {t("studio.welcome.title")}
                    </h1>

                    <p className="mt-2 text-sm text-stone-600 leading-relaxed max-w-2xl">
                        {t("studio.welcome.subtitle")}
                    </p>
                </div>

                <div
                    className="hidden sm:grid h-12 w-12 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
                    <FolderPlus size={18}/>
                </div>
            </div>
        </section>
    );
}
