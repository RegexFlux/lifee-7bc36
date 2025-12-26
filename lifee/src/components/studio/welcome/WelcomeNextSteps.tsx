// src/components/studio/welcome/WelcomeNextSteps.tsx
"use client";

import React from "react";
import {Layers, Wand2, Save, Share2} from "lucide-react";
import {useT} from "@/lib/i18n/useT";

function StepCard({icon, title, body}: { icon: React.ReactNode; title: string; body: string }) {
    return (
        <div className="rounded-3xl border border-stone-200 bg-white/70 backdrop-blur shadow-sm p-5">
            <div className="flex items-start gap-3">
                <div
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-800">
                    {icon}
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-black text-stone-900">{title}</div>
                    <div className="mt-1 text-xs text-stone-500 leading-relaxed">{body}</div>
                </div>
            </div>
        </div>
    );
}

export function WelcomeNextSteps() {
    const {t} = useT();

    return (
        <aside className="space-y-3">
            <StepCard
                icon={<Layers size={18} className="text-rose-600"/>}
                title={t("studio.welcome.steps.organize.title")}
                body={t("studio.welcome.steps.organize.body")}
            />
            <StepCard
                icon={<Wand2 size={18} className="text-amber-600"/>}
                title={t("studio.welcome.steps.generate.title")}
                body={t("studio.welcome.steps.generate.body")}
            />
            <StepCard
                data-tour="welcome-save"
                icon={<Save size={18} className="text-emerald-700"/>}
                title={t("studio.welcome.steps.save.title")}
                body={t("studio.welcome.steps.save.body")}
            />
            <StepCard
                icon={<Share2 size={18} className="text-indigo-600"/>}
                title={t("studio.welcome.steps.share.title")}
                body={t("studio.welcome.steps.share.body")}
            />
        </aside>
    );
}
