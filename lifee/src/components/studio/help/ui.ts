export function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

export function glassCard() {
    return "rounded-3xl border border-stone-200 bg-white/80 backdrop-blur shadow-sm";
}

export function pillBase() {
    return "inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-[11px] font-semibold text-stone-700 shadow-sm backdrop-blur";
}

export function noiseBg() {
    return "pointer-events-none absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]";
}
