"use client";

import * as React from "react";
import {
    Check,
    Copy,
    Info,
    Palette,
    SlidersHorizontal,
    Sparkles,
    Type,
    Wand2,
    X,
} from "lucide-react";
import { PRESETS, type HiddenPresetKey} from "@/types/aigen";

function cx(...a: Array<string | false | null | undefined>) {
    return a.filter(Boolean).join(" ");
}

function safeCopy(text: string) {
    try {
        navigator.clipboard?.writeText(text);
    } catch {
        // ignore
    }
}

function ToggleSwitch(props: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={props.checked}
            onClick={props.onChange}
            disabled={props.disabled}
            className={cx(
                "relative h-7 w-12 rounded-full border transition shrink-0",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                props.checked ? "bg-rose-600 border-rose-600" : "bg-white border-stone-200",
                props.disabled && "opacity-60 cursor-not-allowed"
            )}
        >
      <span
          className={cx(
              "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
              props.checked ? "left-5" : "left-0.5"
          )}
      />
            <span className="sr-only">{props.label}</span>
        </button>
    );
}

function PresetTile(props: {
    on: boolean;
    title: string;
    desc: string;
    tag: string;
    disabled?: boolean;
    onClick: () => void;
    onHover?: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={props.on}
            disabled={props.disabled}
            onClick={props.onClick}
            onPointerEnter={props.onHover}
            onFocus={props.onHover}
            className={cx(
                "group relative rounded-2xl border p-3 text-left transition",
                "outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                props.on
                    ? "border-rose-200 bg-rose-50"
                    : "border-stone-200 bg-white hover:bg-stone-50",
                props.disabled && "opacity-70 cursor-not-allowed"
            )}
        >
            {/* film perforation vibe */}
            <div className="pointer-events-none absolute left-2 top-2 bottom-2 w-1.5 rounded-full bg-stone-200/60 opacity-60" />
            <div className="pointer-events-none absolute right-2 top-2 bottom-2 w-1.5 rounded-full bg-stone-200/40 opacity-30" />

            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
            <span
                className={cx(
                    "inline-flex h-5 w-5 rounded-lg items-center justify-center border",
                    props.on
                        ? "bg-white border-rose-200 text-rose-600"
                        : "bg-stone-50 border-stone-200 text-stone-500"
                )}
                aria-hidden="true"
            >
              {props.on ? <Check size={12} /> : <Wand2 size={12} />}
            </span>
                        <div className="text-sm font-semibold text-stone-900 truncate">{props.title}</div>
                    </div>

                    <div className="mt-1 text-xs text-stone-500 leading-snug">{props.desc}</div>

                    <div className="mt-2 text-[10px] font-mono text-stone-400 truncate">
                        {props.tag}
                    </div>
                </div>

                <span
                    className={cx(
                        "mt-0.5 inline-flex shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide border",
                        props.on
                            ? "bg-white text-rose-700 border-rose-200"
                            : "bg-stone-50 text-stone-600 border-stone-200"
                    )}
                >
          {props.on ? "On" : "Off"}
        </span>
            </div>

            {/* subtle glow */}
            <div
                className={cx(
                    "pointer-events-none absolute -inset-1 rounded-[20px] opacity-0 blur transition",
                    props.on ? "bg-rose-300/20 opacity-100" : "group-hover:opacity-100 bg-stone-300/15"
                )}
                aria-hidden="true"
            />
        </button>
    );
}


export function AdvancedInspectorOverlay(props: {
    open: boolean;
    onClose: () => void;
    isDesktop: boolean;

    restoreColor: boolean;
    onToggleRestoreColor: () => void;

    selected: HiddenPresetKey[];
    onTogglePreset: (k: HiddenPresetKey) => void;

    extraPrompt: string;
    onChangePrompt: (v: string) => void;
    promptRef: React.RefObject<HTMLTextAreaElement>;

    disabled: boolean;

    hiddenPromptPreview?: string;
    onReset?: () => void;
}) {
    const panelId = React.useId();
    const titleId = React.useId();
    const promptId = React.useId();

    const [tab, setTab] = React.useState<"styles" | "prompt">("styles");
    const [spotlight, setSpotlight] = React.useState<HiddenPresetKey>(
        props.selected[0] ?? PRESETS[0].key
    );

    const spotlightPreset = PRESETS.find((p) => p.key === spotlight) ?? PRESETS[0];

    // ESC ferme l'inspector (et pas la modal)
    React.useEffect(() => {
        if (!props.open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                props.onClose();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [props.open, props.onClose]);

    // focus prompt si tab prompt
    React.useEffect(() => {
        if (!props.open) return;
        const t = window.setTimeout(() => {
            if (tab === "prompt") props.promptRef.current?.focus?.();
        }, 60);
        return () => window.clearTimeout(t);
    }, [props.open, tab, props.promptRef]);

    if (!props.open) return null;

    return (
        <div className="absolute inset-0 z-[40]">
            {/* Backdrop local (ne ferme PAS la modal) */}
            <button
                type="button"
                aria-label="Fermer les options avancées"
                className="absolute inset-0 bg-stone-900/20 backdrop-blur-[2px]"
                onClick={(e) => {
                    e.stopPropagation();
                    props.onClose();
                }}
            />

            {/* Panel docké (desktop) / bottom sheet (mobile) */}
            <div
                className={cx(
                    "absolute pointer-events-none",
                    props.isDesktop
                        ? "right-4 top-4 bottom-4 w-[440px]"
                        : "inset-x-0 bottom-0 top-20 px-2 pb-2"
                )}
            >
                <div
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby={titleId}
                    id={panelId}
                    className={cx(
                        "pointer-events-auto h-full",
                        "rounded-[26px] border border-stone-200 bg-white shadow-2xl overflow-hidden",
                        "flex flex-col min-h-0",
                        // petite vibe premium
                        "shadow-[0_40px_120px_-70px_rgba(2,6,23,0.65)]"
                    )}
                >
                    {/* Ambient */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-rose-200/40 blur-3xl" />
                        <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
                        <div className="absolute inset-0 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                    </div>

                    {/* Header */}
                    <div className="relative shrink-0 px-4 py-4 border-b border-stone-100 bg-white/80 backdrop-blur">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-stone-700 shadow-sm">
                                    <Sparkles size={12} className="text-rose-500" />
                                    Inspector avancé
                                </div>
                                <div id={titleId} className="mt-2 text-lg font-serif text-stone-900 leading-tight">
                                    Réglages “film” (sans casser la stabilité)
                                </div>
                                <div className="mt-1 text-xs text-stone-500">
                                    {props.selected.length} styles • Couleur {props.restoreColor ? "ON" : "OFF"}
                                    {props.extraPrompt.trim() ? "custom" : "—"}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {props.onReset ? (
                                    <button
                                        type="button"
                                        onClick={props.onReset}
                                        disabled={props.disabled}
                                        className={cx(
                                            "rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-50 transition",
                                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                                            props.disabled && "opacity-60 cursor-not-allowed"
                                        )}
                                    >
                                        Reset
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={props.onClose}
                                    disabled={props.disabled}
                                    className={cx(
                                        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white hover:bg-stone-50 transition",
                                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                                        props.disabled && "opacity-60 cursor-not-allowed"
                                    )}
                                    aria-label="Fermer"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Body */}
                    <div
                        className="relative flex-1 min-h-0 overflow-y-auto p-4"
                        style={{ scrollbarGutter: "stable both-edges" }}
                    >
                            <div className="grid grid-cols-1 gap-4">
                                <div className="">
                                    <div className="text-[11px] font-bold uppercase text-stone-500">
                                        Contexte
                                    </div>

                                    <label className="sr-only" htmlFor={promptId}>
                                        Donner un contexte au souvenir
                                    </label>

                                    <textarea
                                        id={promptId}
                                        ref={props.promptRef}
                                        rows={5}
                                        disabled={props.disabled}
                                        value={props.extraPrompt}
                                        onChange={(e) => props.onChangePrompt(e.target.value)}
                                        placeholder="Donner un contexte à votre souvenir"
                                        className={cx(
                                            "mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm",
                                            "text-stone-900 placeholder:text-stone-400 outline-none",
                                            "focus:ring-2 focus:ring-rose-200 focus:border-rose-300",
                                            props.disabled && "opacity-70 cursor-not-allowed"
                                        )}
                                    />
                                </div>
                                {/* Color switch */}
                                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                                            <Palette size={16} className="text-amber-600" />
                                            Restaurer les couleurs
                                        </div>
                                        <div className="text-xs text-stone-500">
                                            Colorisation douce (désactivée par défaut).
                                        </div>
                                    </div>

                                    <ToggleSwitch
                                        checked={props.restoreColor}
                                        onChange={props.onToggleRestoreColor}
                                        disabled={props.disabled}
                                        label="Restaurer les couleurs"
                                    />
                                </div>

                                {/* Presets */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-bold uppercase text-stone-500">Styles (stack)</div>
                                        <div className="text-[11px] text-stone-500 font-mono">
                                            {props.selected.length}/{PRESETS.length}
                                        </div>
                                    </div>

                                    <div className="mt-2 grid grid-cols-1 gap-3">
                                        {PRESETS.map((p) => {
                                            const on = props.selected.includes(p.key);
                                            return (
                                                <PresetTile
                                                    key={p.key}
                                                    on={on}
                                                    title={p.title}
                                                    desc={p.desc}
                                                    tag={p.tag}
                                                    disabled={props.disabled}
                                                    onClick={() => props.onTogglePreset(p.key)}
                                                    onHover={() => setSpotlight(p.key)}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                    </div>

                    {/* Footer */}
                    <div className="relative shrink-0 border-t border-stone-100 bg-white/75 backdrop-blur px-4 py-3">
                        <div className="flex items-center justify-between gap-3 text-[11px] text-stone-500">
              <span className="inline-flex items-center gap-2">
                <Sparkles size={14} className="text-rose-500" />
                Appliqué en temps réel
              </span>
                            <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                Inspector docké
              </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
