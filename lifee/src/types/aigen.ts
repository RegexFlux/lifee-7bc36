// components/lifee/aigen/types.ts
import type { Asset } from "@/types/studio";

export type HiddenPresetKey =
    | "cinema_slow"
    | "parallax_soft"
    | "light_warm"
    | "film_grain"
    | "stabilize"
    | "face_focus";

export type HiddenPreset = {
    key: HiddenPresetKey;
    title: string;
    desc: string;
    tag: string;
    defaultOn?: boolean;
};

export const PRESETS: HiddenPreset[] = [
    {
        key: "cinema_slow",
        title: "Mouvement ciné",
        desc: "Dolly-in lent + mouvement doux.",
        tag: "slow cinematic dolly-in, gentle motion",
        defaultOn: true,
    },
    {
        key: "parallax_soft",
        title: "Profondeur douce",
        desc: "Parallax subtil, sans artefacts.",
        tag: "soft parallax depth, subtle separation foreground/background",
        defaultOn: true,
    },
    {
        key: "light_warm",
        title: "Lumière dorée",
        desc: "Ambiance nostalgique chaleureuse.",
        tag: "warm golden light, nostalgic mood",
        defaultOn: true,
    },
    {
        key: "film_grain",
        title: "Grain cinéma",
        desc: "Texture film légère.",
        tag: "light film grain, cinematic texture",
        defaultOn: true,
    },
    {
        key: "stabilize",
        title: "Stabiliser",
        desc: "Réduit tremblements & wobble.",
        tag: "stabilize motion, reduce wobble artifacts",
        defaultOn: true,
    },
    {
        key: "face_focus",
        title: "Focus visage",
        desc: "Priorise le sujet principal.",
        tag: "prioritize face and main subject clarity",
        defaultOn: false,
    },
];

export type AIGenHiddenOptions = {
    restoreColor: boolean; // default false
    presets: HiddenPresetKey[];
    extraPrompt?: string;
};

export type LiveState = {
    step: "idle" | "rendering" | "done" | "error";
    progress: number; // 0..100
    thumbnailUrl?: string | null;
    resultPreviewUrl?: string | null;
    lines?: string[];
    error?: string | null;
    quality?: {
        phase:
            | "idle"
            | "precheck"
            | "denoise"
            | "upscale"
            | "color"
            | "detail"
            | "motion"
            | "render"
            | "upload"
            | "done";
        score?: number; // 0..100
        notes?: string[];
    };
};

export function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function suggestCreditPack(timelineCount: number) {
    const n = Math.max(0, timelineCount);
    if (n <= 6) return 30;
    if (n <= 14) return 30;
    if (n <= 24) return 20;
    if (n <= 40) return 10;
    return 5;
}

export function phaseLabel(p: NonNullable<LiveState["quality"]>["phase"]) {
    switch (p) {
        case "precheck":
            return "Analyse";
        case "denoise":
            return "Nettoyage";
        case "upscale":
            return "Netteté";
        case "color":
            return "Couleurs";
        case "detail":
            return "Détails";
        case "motion":
            return "Mouvement";
        case "render":
            return "Rendu";
        case "upload":
            return "Finalisation";
        case "done":
            return "Terminé";
        default:
            return "Prêt";
    }
}

export function buildHiddenPrompt(opts: AIGenHiddenOptions) {
    const tags = PRESETS.filter((p) => opts.presets.includes(p.key)).map((p) => p.tag);

    const color = opts.restoreColor
        ? "restore natural colors, gentle colorization, preserve skin tones"
        : "keep original tones, do not colorize, avoid altering colors";

    const base = [
        "Create a 3-second cinematic animation from a single photo.",
        "Keep faces stable; avoid distortions, flicker, and warping.",
        "Keep realistic scene; do not add new objects.",
        "Subtle camera motion only; film-like.",
        color,
        ...tags,
    ].join(" | ");

    const extra = (opts.extraPrompt || "").trim();
    return extra ? `${base} | User direction: ${extra}` : base;
}

export type AIGenModalProps = {
    open: boolean;
    source: Asset | null;
    credits: number;
    timelineCount: number;

    onGenerate: (payload: { durationSec: 3; prompt: string; options: AIGenHiddenOptions }) => void;
    onClose: () => void;

    onPurchaseCredits?: (amount: number) => void;

    live?: LiveState;
};
