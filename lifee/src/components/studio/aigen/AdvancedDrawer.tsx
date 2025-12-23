// components/lifee/aigen/dialogs/AdvancedDrawer.tsx
"use client";

import * as React from "react";
import { ChevronDown, Info, Sparkles } from "lucide-react";
import { PRESETS, type HiddenPresetKey} from "@/types/aigen";

export function AdvancedDrawer(props: Readonly<{
    open: boolean;
    onOpenChange: (v: boolean) => void;

    restoreColor: boolean;
    onToggleRestoreColor: () => void;

    selected: HiddenPresetKey[];
    onTogglePreset: (k: HiddenPresetKey) => void;

    extraPrompt: string;
    onChangePrompt: (v: string) => void;
    promptRef: React.RefObject<HTMLTextAreaElement>;

    disabled: boolean;
}>) {
    const panelId = React.useId();
    const labelId = React.useId();
    const promptId = React.useId();

    return (
        <section
            className={[
                "mt-4 rounded-[22px] border border-stone-200 bg-white",
                "shadow-[0_18px_50px_-40px_rgba(2,6,23,0.25)] overflow-hidden",
            ].join(" ")}
            aria-labelledby={labelId}
        >
            {/* Header (button) */}
            <div className="border-b border-stone-100 bg-gradient-to-b from-white to-stone-50">
                <button
                    type="button"
                    onClick={() => props.onOpenChange(!props.open)}
                    disabled={props.disabled}
                    aria-expanded={props.open}
                    aria-controls={panelId}
                    className={[
                        "w-full px-4 py-4 flex items-center justify-between gap-4 text-left",
                        "outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                        "disabled:opacity-70 disabled:cursor-not-allowed",
                    ].join(" ")}
                >
                    <div className="min-w-0">
                        <div id={labelId} className="text-sm font-semibold text-stone-900">
                            Avancé
                        </div>
                        <div className="text-xs text-stone-500">Style & options (optionnel)</div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700">
                            <Sparkles size={14} className="text-rose-500" />
                            Mode pro
                        </div>

                        <span
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm"
                            aria-hidden="true"
                        >
              <ChevronDown
                  size={18}
                  className={[
                      "text-stone-600 transition-transform duration-300",
                      props.open ? "rotate-180" : "rotate-0",
                  ].join(" ")}
              />
            </span>
                    </div>
                </button>
            </div>

            {/* Panel (a11y) */}
            <div
                id={panelId}
                role="region"
                aria-label="Options avancées"
                aria-hidden={!props.open}
                className={[
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                    props.open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                ].join(" ")}
            >
                <div
                    className="min-h-0 overflow-hidden"
                    // ✅ empêche tab/focus quand fermé (React TS: cast)
                    {...(!props.open ? ({ inert: "" } as any) : {})}
                >
                    <div className="p-4 space-y-3">
                        {/* Restore color */}
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-stone-900">
                                    Restaurer les couleurs
                                </div>
                                <div className="text-xs text-stone-500">
                                    Colorisation douce (désactivée par défaut).
                                </div>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={props.restoreColor}
                                onClick={props.onToggleRestoreColor}
                                disabled={props.disabled}
                                className={[
                                    "relative h-7 w-12 rounded-full transition border shrink-0",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                                    props.restoreColor
                                        ? "bg-rose-600 border-rose-600"
                                        : "bg-white border-stone-200",
                                    props.disabled ? "opacity-60 cursor-not-allowed" : "",
                                ].join(" ")}
                            >
                <span
                    className={[
                        "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                        props.restoreColor ? "left-5" : "left-0.5",
                    ].join(" ")}
                />
                                <span className="sr-only">Restaurer les couleurs</span>
                            </button>
                        </div>

                        {/* Presets */}
                        <div>
                            <div className="text-[11px] font-bold uppercase text-stone-500">Styles</div>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {PRESETS.map((p) => {
                                    const on = props.selected.includes(p.key);
                                    return (
                                        <button
                                            key={p.key}
                                            type="button"
                                            onClick={() => props.onTogglePreset(p.key)}
                                            disabled={props.disabled}
                                            aria-pressed={on}
                                            className={[
                                                "text-left rounded-2xl border p-3 transition",
                                                "outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                                                on
                                                    ? "border-rose-200 bg-rose-50"
                                                    : "border-stone-200 bg-white hover:bg-stone-50",
                                                props.disabled ? "opacity-70 cursor-not-allowed" : "",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-stone-900">{p.title}</div>
                                                    <div className="mt-0.5 text-xs text-stone-500">{p.desc}</div>
                                                </div>

                                                <span
                                                    className={[
                                                        "mt-0.5 inline-flex shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                                                        on
                                                            ? "bg-white border border-rose-200 text-rose-700"
                                                            : "bg-stone-50 border border-stone-200 text-stone-600",
                                                    ].join(" ")}
                                                >
                          {on ? "On" : "Off"}
                        </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Prompt */}
                        <div>
                            <div className="text-[11px] font-bold uppercase text-stone-500">Prompt (optionnel)</div>

                            <label className="sr-only" htmlFor={promptId}>
                                Prompt avancé
                            </label>

                            <textarea
                                id={promptId}
                                ref={props.promptRef}
                                rows={4}
                                disabled={props.disabled}
                                value={props.extraPrompt}
                                onChange={(e) => props.onChangePrompt(e.target.value)}
                                placeholder="Ex : été 1984, lumière douce, caméra très lente, émotion…"
                                className={[
                                    "mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm",
                                    "text-stone-900 placeholder:text-stone-400 outline-none",
                                    "focus:ring-2 focus:ring-rose-200 focus:border-rose-300",
                                    "disabled:opacity-70 disabled:cursor-not-allowed",
                                ].join(" ")}
                            />

                            <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-2 pb-2">
                                <Info size={14} className="text-amber-500" />
                                Le prompt s’ajoute aux réglages invisibles (anti-flicker, stabilité visage…).
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
