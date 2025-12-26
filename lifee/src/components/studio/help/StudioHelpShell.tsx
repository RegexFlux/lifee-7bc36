"use client";

import React from "react";
import Link from "next/link";
import {CheckCircle2, Sparkles, Wand2} from "lucide-react";
import {cx, glassCard, pillBase, noiseBg} from "./ui";

type StepId = "welcome" | "organize" | "finalize";

const STEP_META: Record<StepId, { label: string; icon: React.ReactNode; desc: string }> = {
    welcome: {
        label: "Dépôt",
        icon: <Sparkles size={14} className="text-rose-600"/>,
        desc: "Importez vos souvenirs (prévisualisation + retrait).",
    },
    organize: {
        label: "Organisation",
        icon: <Wand2 size={14} className="text-amber-600"/>,
        desc: "Réordonnez par glisser-déposer, ajoutez si besoin.",
    },
    finalize: {
        label: "Finaliser",
        icon: <CheckCircle2 size={14} className="text-emerald-600"/>,
        desc: "Récap + passage en mode Pro sur l’album.",
    },
};

export function StudioHelpShell(props: {
    albumId: string;
    step: StepId;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    const base = `/studio/albums/${encodeURIComponent(props.albumId)}/help`;

    const steps: Array<{ id: StepId; href: string; dataTour?: string }> = [
        {id: "welcome", href: `${base}/welcome`},
        {id: "organize", href: `${base}/organize`, dataTour: "welcome-organize"},
        {id: "finalize", href: `${base}/finalize`},
    ];

    return (
        <div
            className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50 text-stone-900 relative overflow-hidden">
            {/* décor doux */}
            <div
                className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl"/>
            <div
                className="pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl"/>
            <div className={noiseBg()}/>

            <div className="relative z-10 mx-auto max-w-6xl px-6 py-6">
                {/* header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className={pillBase()}>
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400"/>
                            Studio • parcours guidé
                            <span className="ml-2 text-stone-400">•</span>
                            <span className="text-stone-600">
                {steps.findIndex((s) => s.id === props.step) + 1}/{steps.length}
              </span>
                        </div>

                        <div className="mt-3 text-xl sm:text-2xl font-black text-stone-900">{props.title}</div>
                        {props.subtitle ?
                            <div className="mt-1 text-sm text-stone-500 max-w-2xl">{props.subtitle}</div> : null}

                        <div
                            className="mt-3 rounded-2xl border border-stone-200 bg-white/70 backdrop-blur px-4 py-3 text-[12px] text-stone-600 max-w-2xl">
                            <span className="font-semibold text-stone-800">{STEP_META[props.step].label} :</span>{" "}
                            {STEP_META[props.step].desc}
                        </div>
                    </div>

                    {props.right ? (
                        <div className="shrink-0 flex items-center gap-2">{props.right}</div>
                    ) : null}
                </div>

                {/* stepper */}
                <div className={cx(glassCard(), "mt-6 p-2")}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {steps.map((s) => {
                            const active = s.id === props.step;
                            const meta = STEP_META[s.id];
                            return (
                                <Link
                                    data-tour={s.dataTour}
                                    key={s.id}
                                    href={s.href}
                                    className={cx(
                                        "rounded-2xl border px-3 py-2 transition text-left",
                                        active
                                            ? "bg-stone-900 border-stone-900 text-white"
                                            : "bg-white/70 border-stone-200 hover:bg-white"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                    <span className={cx("grid place-items-center h-7 w-7 rounded-2xl border",
                        active ? "border-white/15 bg-white/10" : "border-stone-200 bg-white"
                    )}>
                      {meta.icon}
                    </span>
                                        <div className="min-w-0">
                                            <div
                                                className={cx("text-[12px] font-black", active ? "text-white" : "text-stone-900")}>
                                                {meta.label}
                                            </div>
                                            <div
                                                className={cx("text-[11px] truncate", active ? "text-white/70" : "text-stone-500")}>
                                                {meta.desc}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* content */}
                <div className="mt-6">{props.children}</div>
            </div>
        </div>
    );
}
