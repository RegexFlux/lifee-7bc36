import React, {useEffect, useMemo, useRef} from "react";
import {ArrowRight, Sparkles} from "lucide-react";
import InteractiveDemo from "@/components/landing/InteractiveDemo";
import {StarDustRain} from "@/components/animations/StarDustRain";

type HeroProps = {
    onDownloadClick: () => void;
};

type Dust = {
    x: number;
    y: number;
    r: number;
    vx: number;
    vy: number;
    a: number;
    tw: number; // twinkle speed
    hue: number;
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function useStarDust(enabled = true) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const dprRef = useRef(1);
    const particlesRef = useRef<Dust[]>([]);
    const reducedMotionRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;

        // reduced motion
        try {
            reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        } catch {
            reducedMotionRef.current = false;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            dprRef.current = dpr;

            canvas.width = Math.floor(rect.width * dpr);
            canvas.height = Math.floor(rect.height * dpr);
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            // regen on resize (stable density)
            const density = reducedMotionRef.current ? 0.25 : 1;
            const count = Math.floor((rect.width * rect.height) / 18000 * density); // tuned
            const next: Dust[] = [];

            const baseHueA = 345; // rose
            const baseHueB = 35; // amber

            for (let i = 0; i < count; i++) {
                const t = i / Math.max(1, count - 1);
                const hue = baseHueA * (1 - t) + baseHueB * t;

                next.push({
                    x: Math.random() * rect.width,
                    y: Math.random() * rect.height,
                    r: 0.6 + Math.random() * 1.6,
                    vx: (-0.05 + Math.random() * 0.1) * (reducedMotionRef.current ? 0.25 : 1),
                    vy: (0.25 + Math.random() * 0.55) * (reducedMotionRef.current ? 0.25 : 1),
                    a: 0.18 + Math.random() * 0.32,
                    tw: 0.006 + Math.random() * 0.018,
                    hue,
                });
            }

            particlesRef.current = next;
        };

        const step = () => {
            const parent = canvas.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;

            const dpr = dprRef.current;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            // soft vignette for depth
            const grad = ctx.createRadialGradient(w * 0.55, h * 0.25, 20, w * 0.55, h * 0.25, Math.max(w, h));
            grad.addColorStop(0, "rgba(255,255,255,0.08)");
            grad.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            const ps = particlesRef.current;

            // draw
            for (let i = 0; i < ps.length; i++) {
                const p = ps[i];

                p.x += p.vx;
                p.y += p.vy;

                // recycle
                if (p.y > h + 20) {
                    p.y = -20;
                    p.x = Math.random() * w;
                    p.vy = (0.25 + Math.random() * 0.55) * (reducedMotionRef.current ? 0.25 : 1);
                }
                if (p.x < -40) p.x = w + 40;
                if (p.x > w + 40) p.x = -40;

                // twinkle
                const tw = Math.sin((performance.now() * p.tw) + i) * 0.35 + 0.65;
                const alpha = clamp(p.a * tw, 0, 0.75);

                ctx.beginPath();
                ctx.fillStyle = `hsla(${p.hue} 95% 70% / ${alpha})`;
                ctx.shadowColor = `hsla(${p.hue} 95% 70% / ${alpha})`;
                ctx.shadowBlur = 14;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            rafRef.current = requestAnimationFrame(step);
        };

        const ro = new ResizeObserver(() => resize());
        ro.observe(canvas.parentElement!);

        resize();
        rafRef.current = requestAnimationFrame(step);

        return () => {
            ro.disconnect();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [enabled]);

    return canvasRef;
}

function FloatingBadge({
                           icon,
                           title,
                           desc,
                           className,
                       }: Readonly<{
    icon: React.ReactNode;
    title: string;
    desc: string;
    className: string;
}>) {
    return (
        <div
            className={[
                "pointer-events-none select-none",
                "absolute",
                "rounded-2xl border border-white/40 bg-white/65 backdrop-blur",
                "shadow-[0_18px_60px_-40px_rgba(2,6,23,0.35)]",
                "px-3 py-2",
                "animate-[float_6s_ease-in-out_infinite]",
                className,
            ].join(" ")}
        >
            <div className="flex items-start gap-2">
                <div
                    className="mt-0.5 h-8 w-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                    {icon}
                </div>
                <div className="min-w-0">
                    <div className="text-[12px] font-black text-stone-900 leading-tight">{title}</div>
                    <div className="text-[11px] text-stone-600 leading-snug max-w-[170px]">{desc}</div>
                </div>
            </div>
        </div>
    );
}

export default function Hero({onDownloadClick}: Readonly<HeroProps>) {
    const canvasRef = useStarDust(true);

    const avatars = useMemo(() => [1, 2, 3], []);

    return (
        <header className="relative z-10 overflow-hidden">
            <StarDustRain/>

            {/* Decorative background layer */}
            <div className="pointer-events-none absolute inset-0">
                {/* soft gradients */}
                <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-rose-200/40 blur-3xl"/>
                <div
                    className="absolute -bottom-44 -right-44 h-[640px] w-[640px] rounded-full bg-amber-200/40 blur-3xl"/>
                <div
                    className="absolute left-1/2 top-[-120px] h-[460px] w-[780px] -translate-x-1/2 rounded-[3rem] bg-gradient-to-r from-rose-200/25 via-white/10 to-amber-200/25 blur-2xl"/>

                {/* subtle noise (keep your existing svg URL usage) */}
                <div
                    className="absolute inset-0 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>

                {/* stardust canvas */}
                <div className="absolute inset-0">
                    <canvas ref={canvasRef} className="h-full w-full"/>
                </div>

                {/* light beams */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white/20"/>
                <div className="absolute inset-0 bg-gradient-to-t from-stone-50/40 via-transparent to-white/30"/>

                {/* top shimmer line */}
                <div
                    className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-rose-300/60 to-transparent"/>
            </div>

            {/* Content */}
            <div
                className="relative pt-14 sm:pt-16 pb-20 sm:pb-28 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                {/* Left: copy */}
                <div className="space-y-7 sm:space-y-8">
                    <div
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/60 border border-amber-200 text-amber-900 text-xs font-black tracking-wide uppercase shadow-sm backdrop-blur">
                        <Sparkles size={12}/>
                        Nouvelle technologie de restauration
                    </div>

                    <h1 className="text-[42px] sm:text-6xl md:text-7xl font-serif font-medium leading-[1.05] text-stone-900">
                        Ne laissez pas{" "}
                        <span className="relative inline-block">
              <span className="relative z-10">vos souvenirs</span>
              <span className="absolute -inset-x-3 bottom-1 h-3 rounded-full bg-rose-200/55 blur-[1px]"/>
            </span>{" "}
                        <br/>
                        <span
                            className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500 italic pr-2">
              s&apos;effacer.
            </span>
                    </h1>

                    <p className="text-lg sm:text-xl text-stone-600 max-w-xl leading-relaxed">
                        Transformez vos albums photos en films cinématiques grâce à notre IA.
                        <span className="text-stone-500"> Une frise de vie éternelle à transmettre.</span>
                    </p>

                    {/* CTA row */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <button
                            onClick={onDownloadClick}
                            className={[
                                "group relative overflow-hidden",
                                "px-7 sm:px-8 py-4",
                                "rounded-2xl",
                                "bg-stone-900 hover:bg-stone-800",
                                "text-white text-base sm:text-lg font-bold",
                                "shadow-xl shadow-rose-200/70",
                                "transition-all",
                                "flex items-center justify-center gap-2",
                                "hover:-translate-y-0.5 active:translate-y-0",
                            ].join(" ")}
                        >
                            {/* inner glow */}
                            <span
                                className="absolute -inset-6 bg-gradient-to-r from-rose-500/35 to-amber-500/35 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"/>
                            <span className="relative">Commencer mon album</span>
                            <ArrowRight size={20}
                                        className="relative transition-transform group-hover:translate-x-0.5"/>
                        </button>

                        <div className="flex items-center gap-3 px-1 sm:px-4 text-sm text-stone-600">
                            <div className="flex -space-x-2">
                                {avatars.map((i) => (
                                    <img
                                        key={i}
                                        src={`https://i.pravatar.cc/100?img=${i + 10}`}
                                        alt="user"
                                        className="w-9 h-9 rounded-full border-2 border-stone-50 shadow-sm"
                                        loading="lazy"
                                    />
                                ))}
                            </div>
                            <div className="leading-tight">
                                <div className="font-semibold text-stone-800">Déjà 12 000 souvenirs sauvés</div>
                                <div className="text-xs text-stone-500">et partagés en famille</div>
                            </div>
                        </div>
                    </div>

                    {/* Micro proof chips */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        {[
                            {t: "Restauration auto", c: "bg-rose-50 border-rose-100 text-rose-700"},
                            {t: "Timeline drag & drop", c: "bg-amber-50 border-amber-100 text-amber-800"},
                            {t: "Export HD", c: "bg-white/70 border-stone-200 text-stone-700"},
                        ].map((chip) => (
                            <div
                                key={chip.t}
                                className={[
                                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold shadow-sm backdrop-blur",
                                    chip.c,
                                ].join(" ")}
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70"/>
                                {chip.t}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: interactive demo + floating badges */}
                <div className="relative">

                    <div className="pointer-events-none absolute z-40 inset-0 hidden lg:block w-1/2 left-96 top-64">
                        <FloatingBadge
                            className="left-24 -top-24"
                            icon={<Sparkles size={14}/>}
                            title="Effet “cinéma”"
                            desc="Stabilisation + lumière douce."
                        />
                        <FloatingBadge
                            className="left-24 animate-[float_7.5s_ease-in-out_infinite]"
                            icon={<Sparkles size={14}/>}
                            title="Restauration"
                            desc="Contraste & couleurs fidèles."
                        />
                        <FloatingBadge
                            className="left-24 top-24 animate-[float_8.5s_ease-in-out_infinite]"
                            icon={<Sparkles size={14}/>}
                            title="Partage privé"
                            desc="Un lien, zéro réseau social."
                        />
                    </div>

                    {/* frame */}
                    <div className="relative">
                        <div
                            className="absolute -inset-6 bg-gradient-to-tr from-rose-200/55 to-amber-200/55 blur-3xl opacity-55 rounded-[2.5rem]"/>
                        <InteractiveDemo onDownloadClick={onDownloadClick}/>
                    </div>

                    {/* mobile helper note */}
                    <div className="mt-4 text-xs text-stone-500 lg:hidden">
                        Astuce : glissez-déposez vos photos dans la timeline pour raconter l’histoire.
                    </div>
                </div>
            </div>
        </header>
    );
}
