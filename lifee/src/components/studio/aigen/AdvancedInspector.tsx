"use client";

import * as React from "react";
import {
    Sparkles,
    SlidersHorizontal,
    Palette,
    Type,
    Check,
    X,
    Wand2,
    Copy,
    Info,
} from "lucide-react";
import { PRESETS, type HiddenPresetKey} from "@/types/aigen";

function cx(...a: Array<string | false | null | undefined>) {
    return a.filter(Boolean).join(" ");
}

function usePrefersReducedMotion() {
    const [reduced, setReduced] = React.useState(false);
    React.useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const on = () => setReduced(mq.matches);
        on();
        mq.addEventListener?.("change", on);
        return () => mq.removeEventListener?.("change", on);
    }, []);
    return reduced;
}

function countActive(selected: HiddenPresetKey[]) {
    return selected.length;
}

function buildTags(selected: HiddenPresetKey[]) {
    return PRESETS.filter((p) => selected.includes(p.key)).map((p) => p.tag);
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

function ChipButton(props: {
    on: boolean;
    title: string;
    desc: string;
    kbdHint?: string;
    onClick: () => void;
    disabled?: boolean;
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
            <div className="pointer-events-none absolute right-2 top-2 bottom-2 w-1.5 rounded-full bg-stone-200/60 opacity-30" />

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
                        <div className="text-sm font-semibold text-stone-900 truncate">
                            {props.title}
                        </div>
                    </div>

                    <div className="mt-1 text-xs text-stone-500 leading-snug">
                        {props.desc}
                    </div>

                    {props.kbdHint ? (
                        <div className="mt-2 text-[10px] font-mono text-stone-400">
                            {props.kbdHint}
                        </div>
                    ) : null}
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

function Tabs(props: {
    tab: "styles" | "prompt";
    onChange: (t: "styles" | "prompt") => void;
    disabled?: boolean;
}) {
    return (
        <div
            className={cx(
                "inline-flex items-center rounded-full border border-stone-200 bg-white p-1 shadow-sm"
            )}
            role="tablist"
            aria-label="Sections avancées"
        >
            <button
                type="button"
                role="tab"
                aria-selected={props.tab === "styles"}
                disabled={props.disabled}
                onClick={() => props.onChange("styles")}
                className={cx(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                    props.tab === "styles" ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-50",
                    props.disabled && "opacity-60 cursor-not-allowed"
                )}
            >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal size={14} />
          Styles
        </span>
            </button>

            <button
                type="button"
                role="tab"
                aria-selected={props.tab === "prompt"}
                disabled={props.disabled}
                onClick={() => props.onChange("prompt")}
                className={cx(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                    props.tab === "prompt" ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-50",
                    props.disabled && "opacity-60 cursor-not-allowed"
                )}
            >
        <span className="inline-flex items-center gap-2">
          <Type size={14} />
          Director Prompt
        </span>
            </button>
        </div>
    );
}

export function AdvancedInspector(props: {
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

    // optional for reset
    onReset?: () => void;

    // optional: preview string to show
    hiddenPromptPreview?: string;
}) {
    const reducedMotion = usePrefersReducedMotion();

    const panelId = React.useId();
    const labelId = React.useId();
    const promptId = React.useId();

    const [tab, setTab] = React.useState<"styles" | "prompt">("styles");
    const [spotlight, setSpotlight] = React.useState<HiddenPresetKey>(
        props.selected[0] ?? PRESETS[0].key
    );

    const activeCount = countActive(props.selected);
    const tags = buildTags(props.selected);
    const hasPrompt = Boolean(props.extraPrompt.trim());

    const openerRef = React.useRef<HTMLButtonElement | null>(null);

    // focus management: when opened, go to prompt if tab=prompt else first chip
    React.useEffect(() => {
        if (!props.open) return;
        const t = window.setTimeout(() => {
            if (tab === "prompt") props.promptRef.current?.focus?.();
            // sinon laisse le focus sur le panneau, c'est ok
        }, 60);
        return () => window.clearTimeout(t);
    }, [props.open, tab, props.promptRef]);

    // Esc to close inspector (without leaving modal)
    React.useEffect(() => {
        if (!props.open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                props.onOpenChange(false);
                openerRef.current?.focus?.();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [props.open, props.onOpenChange]);

    const spotlightPreset = PRESETS.find((p) => p.key === spotlight) ?? PRESETS[0];

    return (
        <section aria-labelledby={labelId} className="mt-4">
            {/* CONTROL STRIP (innovant / compact) */}
            <button
                ref={openerRef}
                type="button"
                onClick={() => props.onOpenChange(!props.open)}
                disabled={props.disabled}
                aria-expanded={props.open}
                aria-controls={panelId}
                className={cx(
                    "w-full rounded-2xl border border-stone-200 bg-white/80 backdrop-blur shadow-sm",
                    "px-3 py-3 transition text-left",
                    "hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                    props.disabled && "opacity-70 cursor-not-allowed"
                )}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
              <span
                  className="inline-flex h-9 w-9 rounded-2xl bg-rose-50 border border-rose-100 items-center justify-center text-rose-600"
                  aria-hidden="true"
              >
                <Sparkles size={18} />
              </span>

                            <div className="min-w-0">
                                <div id={labelId} className="text-sm font-semibold text-stone-900">
                                    Avancé (Inspector)
                                </div>
                                <div className="text-xs text-stone-500 truncate">
                                    {activeCount} styles • Couleurs {props.restoreColor ? "ON" : "OFF"} • Prompt{" "}
                                    {hasPrompt ? "custom" : "—"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
            <span
                className={cx(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold",
                    activeCount > 0
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-stone-200 bg-stone-50 text-stone-600"
                )}
            >
              <SlidersHorizontal size={14} />
                {activeCount} actifs
            </span>

                        <span
                            className={cx(
                                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold",
                                props.restoreColor
                                    ? "border-amber-200 bg-amber-50 text-amber-800"
                                    : "border-stone-200 bg-white text-stone-600"
                            )}
                        >
              <Palette size={14} />
              Couleur
            </span>

                        <span
                            className={cx(
                                "inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm",
                                "transition"
                            )}
                            aria-hidden="true"
                        >
              <span
                  className={cx(
                      "block h-2 w-2 rounded-full",
                      props.open ? "bg-rose-500" : "bg-stone-300"
                  )}
              />
            </span>
                    </div>
                </div>

                {/* tiny “ticker” preview */}
                {tags.length ? (
                    <div className="mt-3">
                        <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                                Stack actif
                            </div>
                            <div className="mt-1 text-[11px] text-stone-600 font-mono truncate">
                                {tags.join(" • ")}
                            </div>
                        </div>
                    </div>
                ) : null}
            </button>

            {/* INSPECTOR PANEL */}
            <div
                id={panelId}
                role="region"
                aria-label="Options avancées"
                aria-hidden={!props.open}
                className={cx(
                    "mt-3 rounded-[22px] border border-stone-200 bg-white shadow-[0_18px_50px_-40px_rgba(2,6,23,0.25)] overflow-hidden",
                    "transition-[transform,opacity] duration-300 ease-out",
                    props.open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
                )}
            >
                {/* Header */}
                <div className="px-4 py-4 border-b border-stone-100 bg-gradient-to-b from-white to-stone-50">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-stone-900">Control Deck</div>
                            <div className="text-xs text-stone-500">
                                Ajustez le rendu “film” — sans casser la stabilité.
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
                                onClick={() => props.onOpenChange(false)}
                                disabled={props.disabled}
                                className={cx(
                                    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white hover:bg-stone-50 transition",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                                    props.disabled && "opacity-60 cursor-not-allowed"
                                )}
                                aria-label="Fermer les options avancées"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                        <Tabs tab={tab} onChange={setTab} disabled={props.disabled} />

                        <div className="hidden md:flex items-center gap-2 text-[11px] text-stone-500">
                            <Info size={14} className="text-amber-500" />
                            Tout reste “safe” (anti-flicker / stabilité visage).
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div
                    className={cx(
                        "p-4",
                        // safety: avoid giant panel
                        "max-h-[70vh] overflow-auto"
                    )}
                    style={{ scrollbarGutter: "stable both-edges" }}
                    {...(!props.open ? ({ inert: "" } as any) : {})}
                >
                    {tab === "styles" ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                            {/* Left: filmstrip presets */}
                            <div className="lg:col-span-8">
                                {/* Color switch row */}
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

                                {/* Presets grid (film frames) */}
                                <div className="mt-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-bold uppercase text-stone-500">
                                            Styles (stack)
                                        </div>
                                        <div className="text-[11px] text-stone-500 font-mono">
                                            {props.selected.length}/{PRESETS.length} actifs
                                        </div>
                                    </div>

                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {PRESETS.map((p) => {
                                            const on = props.selected.includes(p.key);
                                            return (
                                                <ChipButton
                                                    key={p.key}
                                                    on={on}
                                                    title={p.title}
                                                    desc={p.desc}
                                                    disabled={props.disabled}
                                                    onClick={() => props.onTogglePreset(p.key)}
                                                    onHover={() => setSpotlight(p.key)}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Tags preview */}
                                    {props.hiddenPromptPreview ? (
                                        <div className="mt-3 rounded-2xl border border-stone-200 bg-white px-3 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-[11px] font-bold uppercase text-stone-500">
                                                    Preview prompt final
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => safeCopy(props.hiddenPromptPreview || "")}
                                                    className={cx(
                                                        "inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-50 transition",
                                                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                                                    )}
                                                >
                                                    <Copy size={14} />
                                                    Copier
                                                </button>
                                            </div>
                                            <div className="mt-2 text-[11px] font-mono text-stone-600 leading-snug max-h-20 overflow-auto pr-1">
                                                {props.hiddenPromptPreview}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Right: spotlight / details */}
                            <div className="lg:col-span-4">
                                <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                                    <div className="px-4 py-4 border-b border-stone-100 bg-gradient-to-b from-white to-stone-50">
                                        <div className="text-sm font-semibold text-stone-900">
                                            Focus preset
                                        </div>
                                        <div className="text-xs text-stone-500">
                                            Détails & tag utilisé.
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        <div>
                                            <div className="text-sm font-semibold text-stone-900">
                                                {spotlightPreset.title}
                                            </div>
                                            <div className="mt-1 text-xs text-stone-500">
                                                {spotlightPreset.desc}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                                            <div className="text-[11px] font-bold uppercase text-stone-500">
                                                Tag (invisible)
                                            </div>
                                            <div className="mt-2 text-[11px] font-mono text-stone-700 leading-snug">
                                                {spotlightPreset.tag}
                                            </div>
                                            <div className="mt-3 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => safeCopy(spotlightPreset.tag)}
                                                    className={cx(
                                                        "inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-50 transition",
                                                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                                                    )}
                                                >
                                                    <Copy size={14} />
                                                    Copier le tag
                                                </button>

                                                <span className="text-[11px] text-stone-500">
                          (debug)
                        </span>
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-stone-500 flex items-start gap-2">
                                            <Sparkles size={14} className="text-rose-500 mt-0.5" />
                                            Astuce : garde 3–5 presets max pour un rendu cohérent.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // PROMPT TAB
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                            <div className="lg:col-span-7">
                                <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                                    <div className="px-4 py-4 border-b border-stone-100 bg-gradient-to-b from-white to-stone-50">
                                        <div className="text-sm font-semibold text-stone-900">
                                            Director Prompt
                                        </div>
                                        <div className="text-xs text-stone-500">
                                            Une direction artistique en plus (facultatif).
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <div className="text-[11px] font-bold uppercase text-stone-500">
                                            Prompt additionnel
                                        </div>

                                        <label className="sr-only" htmlFor={promptId}>
                                            Prompt avancé
                                        </label>

                                        <textarea
                                            id={promptId}
                                            ref={props.promptRef}
                                            rows={5}
                                            disabled={props.disabled}
                                            value={props.extraPrompt}
                                            onChange={(e) => props.onChangePrompt(e.target.value)}
                                            placeholder="Ex : été 1984, lumière douce, caméra très lente, émotion…"
                                            className={cx(
                                                "mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm",
                                                "text-stone-900 placeholder:text-stone-400 outline-none",
                                                "focus:ring-2 focus:ring-rose-200 focus:border-rose-300",
                                                props.disabled && "opacity-70 cursor-not-allowed"
                                            )}
                                        />

                                        <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-2">
                                            <Info size={14} className="text-amber-500" />
                                            Conseil : privilégie une ambiance + une contrainte caméra (lent, doux).
                                        </div>

                                        {/* example chips */}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {[
                                                "lumière dorée, nostalgie",
                                                "caméra très lente, dolly-in",
                                                "grain film léger, soft vignette",
                                                "émotion, sourire subtil",
                                                "fin d’après-midi, contre-jour doux",
                                            ].map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    disabled={props.disabled}
                                                    onClick={() =>
                                                        props.onChangePrompt(
                                                            props.extraPrompt.trim()
                                                                ? `${props.extraPrompt.trim()}, ${s}`
                                                                : s
                                                        )
                                                    }
                                                    className={cx(
                                                        "rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 transition",
                                                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                                                        props.disabled && "opacity-60 cursor-not-allowed"
                                                    )}
                                                >
                                                    + {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-5">
                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                                    <div className="flex items-center gap-2">
                    <span
                        className="inline-flex h-9 w-9 rounded-2xl bg-white border border-stone-200 items-center justify-center text-stone-700"
                        aria-hidden="true"
                    >
                      <SlidersHorizontal size={16} />
                    </span>
                                        <div>
                                            <div className="text-sm font-semibold text-stone-900">Stack actif</div>
                                            <div className="text-xs text-stone-500">
                                                {props.selected.length} styles • Couleur {props.restoreColor ? "ON" : "OFF"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-3">
                                        <div className="text-[11px] font-bold uppercase text-stone-500">
                                            Tags actifs
                                        </div>
                                        <div className="mt-2 text-[11px] font-mono text-stone-700 leading-snug">
                                            {buildTags(props.selected).join(" • ") || "—"}
                                        </div>
                                    </div>

                                    {props.hiddenPromptPreview ? (
                                        <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-[11px] font-bold uppercase text-stone-500">
                                                    Prompt final
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => safeCopy(props.hiddenPromptPreview || "")}
                                                    className={cx(
                                                        "inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-50 transition",
                                                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                                                    )}
                                                >
                                                    <Copy size={14} />
                                                    Copier
                                                </button>
                                            </div>

                                            <div className="mt-2 text-[11px] font-mono text-stone-600 leading-snug max-h-28 overflow-auto pr-1">
                                                {props.hiddenPromptPreview}
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="mt-3 text-[11px] text-stone-500 flex items-start gap-2">
                                        <Sparkles size={14} className="text-rose-500 mt-0.5" />
                                        Le prompt custom doit rester court : 1 ambiance, 1 caméra, 1 émotion.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer tiny */}
                <div className="border-t border-stone-100 bg-white/70 backdrop-blur px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-stone-500">
            <span className="inline-flex items-center gap-2">
              <Sparkles size={14} className="text-rose-500" />
              Changements appliqués en temps réel.
            </span>
                        {!reducedMotion ? (
                            <span className="hidden md:inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                Inspector animé
              </span>
                        ) : (
                            <span className="hidden md:inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                Motion réduit
              </span>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
