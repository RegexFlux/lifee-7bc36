"use client";

import React, { useEffect, useRef } from "react";

type StarDustProps = {
    className?: string;
    density?: number;            // 0.2..2 (1 = normal)
    speed?: number;              // 0.2..2 (1 = normal)
    opacity?: number;            // 0..1
    hueA?: number;               // ex: 345 (rose)
    hueB?: number;               // ex: 35 (ambre)
    wind?: number;               // -1..1 (drift horizontal)
    vignette?: boolean;
};

type P = {
    x: number;
    y: number;
    r: number;
    vy: number;
    vx: number;
    a: number;
    tw: number;
    hue: number;
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function StarDust({
                             className,
                             density = 1,
                             speed = 1,
                             opacity = 1,
                             hueA = 345,
                             hueB = 35,
                             wind = 0.12,
                             vignette = true,
                         }: StarDustProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const dprRef = useRef(1);
    const psRef = useRef<P[]>([]);
    const reducedRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // respects reduced motion
        try {
            reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        } catch {
            reducedRef.current = false;
        }

        const parent = canvas.parentElement;
        if (!parent) return;

        const makeParticles = (w: number, h: number) => {
            const rm = reducedRef.current ? 0.25 : 1;
            const base = (w * h) / 19000; // tuned density baseline
            const count = Math.floor(base * clamp(density, 0.2, 2) * rm);

            const next: P[] = [];
            for (let i = 0; i < count; i++) {
                const t = i / Math.max(1, count - 1);
                const hue = hueA * (1 - t) + hueB * t;

                next.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: 0.6 + Math.random() * 1.8,
                    vy: (0.22 + Math.random() * 0.55) * speed * rm,
                    vx: ((-0.08 + Math.random() * 0.16) + wind * 0.25) * speed * rm,
                    a: (0.16 + Math.random() * 0.32) * opacity,
                    tw: 0.006 + Math.random() * 0.02,
                    hue,
                });
            }
            psRef.current = next;
        };

        const resize = () => {
            const rect = parent.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            dprRef.current = dpr;

            canvas.width = Math.floor(rect.width * dpr);
            canvas.height = Math.floor(rect.height * dpr);
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            makeParticles(rect.width, rect.height);
        };

        const draw = () => {
            const rect = parent.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;

            const dpr = dprRef.current;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            // soft vignette for depth
            if (vignette) {
                const g = ctx.createRadialGradient(w * 0.55, h * 0.25, 10, w * 0.55, h * 0.25, Math.max(w, h));
                g.addColorStop(0, "rgba(255,255,255,0.07)");
                g.addColorStop(1, "rgba(255,255,255,0)");
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
            }

            const ps = psRef.current;
            const now = performance.now();

            for (let i = 0; i < ps.length; i++) {
                const p = ps[i];

                // move
                p.x += p.vx;
                p.y += p.vy;

                // recycle
                if (p.y > h + 20) {
                    p.y = -20;
                    p.x = Math.random() * w;
                    p.vy = (0.22 + Math.random() * 0.55) * speed * (reducedRef.current ? 0.25 : 1);
                }
                if (p.x < -40) p.x = w + 40;
                if (p.x > w + 40) p.x = -40;

                // twinkle
                const tw = Math.sin(now * p.tw + i) * 0.35 + 0.65;
                const alpha = clamp(p.a * tw, 0, 0.85);

                // glow dot
                ctx.beginPath();
                ctx.fillStyle = `hsla(${p.hue} 95% 72% / ${alpha})`;
                ctx.shadowColor = `hsla(${p.hue} 95% 72% / ${alpha})`;
                ctx.shadowBlur = 14;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // tiny “spark” cross occasionally (cheap)
                if (p.r > 1.6 && tw > 0.92) {
                    ctx.globalAlpha = alpha * 0.6;
                    ctx.strokeStyle = `hsla(${p.hue} 95% 80% / ${alpha})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x - 2.8, p.y);
                    ctx.lineTo(p.x + 2.8, p.y);
                    ctx.moveTo(p.x, p.y - 2.8);
                    ctx.lineTo(p.x, p.y + 2.8);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }

            rafRef.current = requestAnimationFrame(draw);
        };

        const ro = new ResizeObserver(() => resize());
        ro.observe(parent);

        resize();
        rafRef.current = requestAnimationFrame(draw);

        return () => {
            ro.disconnect();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [density, speed, opacity, hueA, hueB, wind, vignette]);

    return (
        <canvas
            ref={canvasRef}
            className={["pointer-events-none absolute inset-0", className].filter(Boolean).join(" ")}
            aria-hidden="true"
        />
    );
}
