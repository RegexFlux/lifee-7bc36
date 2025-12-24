"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Film, Image as ImageIcon, Sparkles, X } from "lucide-react";

/**
 * ✅ If you don't have it:
 * pnpm add animejs
 * (or npm i animejs / yarn add animejs)
 */

type Props = {
    open?: boolean;
    forceOpen?: boolean;
    storageKey?: string;
    durationMs?: number;
    onDone?: () => void;
};

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function rand(min: number, max: number) {
    return min + Math.random() * (max - min);
}

function makeSprite(radius: number, rgba = "255,255,255") {
    const c = document.createElement("canvas");
    const pad = Math.ceil(radius * 2.2);
    c.width = pad * 2;
    c.height = pad * 2;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(pad, pad, 0, pad, pad, pad);
    g.addColorStop(0, `rgba(${rgba},0.16)`);
    g.addColorStop(0.35, `rgba(${rgba},0.085)`);
    g.addColorStop(1, `rgba(${rgba},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pad, pad, pad, 0, Math.PI * 2);
    ctx.fill();
    return { canvas: c, size: pad * 2 };
}

/** --------- Cinematic animated background (anime.js + canvas “bokeh” + film UI layers) --------- */
function CinematicBackdrop({ active }: { active: boolean }) {
    const reduced = useReducedMotion();

    const rootRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const blob1 = useRef<SVGCircleElement | null>(null);
    const blob2 = useRef<SVGCircleElement | null>(null);
    const blob3 = useRef<SVGCircleElement | null>(null);
    const blob4 = useRef<SVGCircleElement | null>(null);
    const blob5 = useRef<SVGCircleElement | null>(null);

    const ribbon1 = useRef<SVGPathElement | null>(null);
    const ribbon2 = useRef<SVGPathElement | null>(null);
    const ribbon3 = useRef<SVGPathElement | null>(null);

    const turb = useRef<SVGFETurbulenceElement | null>(null);
    const disp = useRef<SVGFEDisplacementMapElement | null>(null);

    // --- Pointer parallax (multi-layer, very controlled) ---
    useEffect(() => {
        if (!active) return;
        const el = rootRef.current;
        if (!el) return;

        if (reduced) {
            el.style.setProperty("--px", "0px");
            el.style.setProperty("--py", "0px");
            el.style.setProperty("--rx", "0deg");
            el.style.setProperty("--ry", "0deg");
            return;
        }

        let raf = 0;
        let tx = 0,
            ty = 0;
        let cxp = 0,
            cyp = 0;

        const onMove = (e: PointerEvent) => {
            const w = window.innerWidth || 1;
            const h = window.innerHeight || 1;
            const nx = (e.clientX / w) * 2 - 1;
            const ny = (e.clientY / h) * 2 - 1;
            tx = nx;
            ty = ny;
            if (!raf) raf = requestAnimationFrame(loop);
        };

        const loop = () => {
            raf = 0;
            cxp = lerp(cxp, tx, 0.08);
            cyp = lerp(cyp, ty, 0.08);

            const px = clamp(cxp * 16, -16, 16);
            const py = clamp(cyp * 12, -12, 12);

            // tiny tilt (used for a “camera” feel)
            const ry = clamp(cxp * 2.2, -2.2, 2.2);
            const rx = clamp(-cyp * 1.8, -1.8, 1.8);

            el.style.setProperty("--px", `${px}px`);
            el.style.setProperty("--py", `${py}px`);
            el.style.setProperty("--rx", `${rx}deg`);
            el.style.setProperty("--ry", `${ry}deg`);

            if (Math.abs(cxp - tx) > 0.002 || Math.abs(cyp - ty) > 0.002) {
                raf = requestAnimationFrame(loop);
            }
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        return () => {
            window.removeEventListener("pointermove", onMove);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [active, reduced]);

    // --- Canvas: dust + bokeh + streaks (single pass, sprite-based, pauses when hidden) ---
    useEffect(() => {
        if (!active) return;
        const c = canvasRef.current;
        if (!c) return;

        const ctx = c.getContext("2d", { alpha: true });
        if (!ctx) return;

        const dpr = Math.min(2, window.devicePixelRatio || 1);
        let w = 0,
            h = 0;

        const resize = () => {
            w = Math.max(1, Math.floor(window.innerWidth));
            h = Math.max(1, Math.floor(window.innerHeight));
            c.width = Math.floor(w * dpr);
            c.height = Math.floor(h * dpr);
            c.style.width = `${w}px`;
            c.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();
        window.addEventListener("resize", resize);

        // sprites (fast)
        const sSmall = reduced ? null : makeSprite(10);
        const sMed = reduced ? null : makeSprite(18);
        const sBig = reduced ? null : makeSprite(28);

        // density tuned for “premium” + safe perf
        const area = w * h;
        const dustCount = reduced ? 0 : Math.round(clamp(area / 24000, 26, 86));
        const bokehCount = reduced ? 0 : Math.round(clamp(area / 160000, 6, 16));
        const streakCount = reduced ? 0 : Math.round(clamp(area / 520000, 2, 6));

        const dust = Array.from({ length: dustCount }).map(() => ({
            x: rand(0, w),
            y: rand(0, h),
            r: rand(0.6, 2.2),
            a: rand(0.035, 0.12),
            vx: rand(-0.09, 0.09),
            vy: rand(-0.20, -0.05),
            tw: rand(0, Math.PI * 2),
            z: rand(0.35, 1.0), // depth
        }));

        const bokeh = Array.from({ length: bokehCount }).map(() => ({
            x: rand(0, w),
            y: rand(0, h),
            s: Math.random() < 0.55 ? "small" : Math.random() < 0.8 ? "med" : "big",
            a: rand(0.04, 0.12),
            vx: rand(-0.03, 0.03),
            vy: rand(-0.08, -0.02),
            tw: rand(0, Math.PI * 2),
            z: rand(0.15, 0.55),
        }));

        const streaks = Array.from({ length: streakCount }).map(() => ({
            x: rand(-w * 0.2, w * 1.2),
            y: rand(h * 0.1, h * 0.9),
            len: rand(160, 520),
            a: rand(0.02, 0.07),
            v: rand(0.25, 0.62),
            w: rand(1, 2),
            phase: rand(0, Math.PI * 2),
        }));

        let raf = 0;
        let last = performance.now();
        let running = !reduced;

        const onVis = () => {
            running = !document.hidden && !reduced;
            if (running && !raf) {
                last = performance.now();
                raf = requestAnimationFrame(tick);
            }
        };
        document.addEventListener("visibilitychange", onVis);

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick);
            if (!running) return;

            const dt = Math.min(32, now - last);
            last = now;

            ctx.clearRect(0, 0, w, h);

            // soft “atmosphere” base (super subtle)
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "rgba(255,255,255,0.015)";
            ctx.fillRect(0, 0, w, h);

            // bokeh layer (screen)
            if (sSmall && sMed && sBig) {
                ctx.globalCompositeOperation = "lighter";
                for (const p of bokeh) {
                    p.tw += dt * 0.0012;
                    p.x += p.vx * dt;
                    p.y += p.vy * dt + Math.sin(p.tw) * 0.02 * dt;

                    if (p.x < -60) p.x = w + 60;
                    if (p.x > w + 60) p.x = -60;
                    if (p.y < -80) p.y = h + 80;

                    const alpha = p.a * (0.7 + 0.3 * Math.sin(p.tw));
                    ctx.globalAlpha = alpha;

                    const sprite = p.s === "small" ? sSmall : p.s === "med" ? sMed : sBig;
                    const size = sprite.size * (0.85 + (1 - p.z) * 0.6);
                    ctx.drawImage(sprite.canvas, p.x - size / 2, p.y - size / 2, size, size);
                }
                ctx.globalAlpha = 1;
            }

            // dust motes (screen)
            ctx.globalCompositeOperation = "lighter";
            for (const p of dust) {
                p.tw += dt * 0.0018;
                p.x += p.vx * dt * (0.55 + p.z);
                p.y += p.vy * dt * (0.55 + p.z) + Math.sin(p.tw) * 0.02 * dt;

                if (p.x < -20) p.x = w + 20;
                if (p.x > w + 20) p.x = -20;
                if (p.y < -30) p.y = h + 30;

                const alpha = p.a * (0.7 + 0.3 * Math.sin(p.tw));
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }

            // streaks (very soft “lens streaks”)
            ctx.globalCompositeOperation = "lighter";
            for (const s of streaks) {
                s.phase += dt * 0.001;
                s.x += s.v * dt;
                if (s.x > w + s.len + 120) {
                    s.x = -s.len - 120;
                    s.y = rand(h * 0.12, h * 0.88);
                }
                const pulse = 0.6 + 0.4 * Math.sin(s.phase);
                const a = s.a * pulse;

                const g = ctx.createLinearGradient(s.x, s.y, s.x + s.len, s.y);
                g.addColorStop(0, `rgba(255,255,255,0)`);
                g.addColorStop(0.25, `rgba(255,255,255,${a})`);
                g.addColorStop(0.75, `rgba(255,255,255,${a * 0.6})`);
                g.addColorStop(1, `rgba(255,255,255,0)`);

                ctx.strokeStyle = g;
                ctx.lineWidth = s.w;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x + s.len, s.y);
                ctx.stroke();
            }

            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
        };

        if (!reduced) raf = requestAnimationFrame(tick);

        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [active, reduced]);

    // --- anime.js: organic blob drift + ribbon flow + subtle liquid warp (safe cleanup) ---
    useEffect(() => {
        if (!active || reduced) return;

        let canceled = false;
        let anime: any = null;
        const bounds = { w: window.innerWidth, h: window.innerHeight };
        const targets: Element[] = [];
        const instances: any[] = [];

        const add = <T extends Element | null>(t: T) => {
            if (t) targets.push(t);
            return t;
        };

        const onResize = () => {
            bounds.w = window.innerWidth;
            bounds.h = window.innerHeight;
        };

        const drift = (el: SVGCircleElement, baseR: number, speed: number) => {
            if (canceled || !anime) return;

            const cxv = rand(bounds.w * 0.16, bounds.w * 0.84);
            const cyv = rand(bounds.h * 0.16, bounds.h * 0.84);
            const rv = rand(baseR * 0.78, baseR * 1.22);
            const ov = rand(0.45, 0.95);

            const inst = anime({
                targets: el,
                cx: cxv,
                cy: cyv,
                r: rv,
                opacity: ov,
                duration: rand(speed * 0.85, speed * 1.35),
                easing: "easeInOutSine",
                complete: () => {
                    if (!canceled) drift(el, baseR, speed);
                },
            });
            instances.push(inst);
        };

        (async () => {
            try {
                anime = (await import("animejs/lib/anime.es.js")).default;
            } catch {
                return;
            }
            if (canceled) return;

            window.addEventListener("resize", onResize);

            const b1 = add(blob1.current);
            const b2 = add(blob2.current);
            const b3 = add(blob3.current);
            const b4 = add(blob4.current);
            const b5 = add(blob5.current);

            if (b1) drift(b1, 270, 2600);
            if (b2) drift(b2, 340, 3200);
            if (b3) drift(b3, 230, 2450);
            if (b4) drift(b4, 300, 2950);
            if (b5) drift(b5, 210, 2350);

            const r1 = add(ribbon1.current);
            const r2 = add(ribbon2.current);
            const r3 = add(ribbon3.current);

            const flow = (path: SVGPathElement, dir: 1 | -1, dur: number, dashRatio: number) => {
                if (!path?.getTotalLength) return;
                const len = path.getTotalLength() || 900;
                path.style.strokeDasharray = `${Math.round(len * dashRatio)} ${Math.round(len * (1 - dashRatio))}`;
                const inst = anime({
                    targets: path,
                    strokeDashoffset: [0, dir * -len],
                    duration: dur,
                    easing: "linear",
                    loop: true,
                });
                instances.push(inst);
            };

            if (r1) flow(r1, 1, 3800, 0.34);
            if (r2) flow(r2, -1, 4600, 0.28);
            if (r3) flow(r3, 1, 5200, 0.22);

            const t = add(turb.current);
            const d = add(disp.current);

            if (t) {
                const inst = anime({
                    targets: t,
                    baseFrequency: [0.010, 0.017],
                    duration: 3000,
                    direction: "alternate",
                    easing: "easeInOutSine",
                    loop: true,
                });
                instances.push(inst);
            }

            if (d) {
                const inst = anime({
                    targets: d,
                    scale: [10, 22],
                    duration: 3400,
                    direction: "alternate",
                    easing: "easeInOutSine",
                    loop: true,
                });
                instances.push(inst);
            }
        })();

        return () => {
            canceled = true;
            window.removeEventListener("resize", onResize);

            try {
                // Stop instances (preferred)
                for (const inst of instances) inst?.pause?.();
                // Remove animations tied to our elements (fallback)
                if (anime && targets.length) anime.remove(targets);
            } catch {
                // ignore
            }
        };
    }, [active, reduced]);

    return (
        <div
            ref={rootRef}
            className="absolute inset-0 overflow-hidden"
            style={{
                transform: "translate3d(var(--px, 0px), var(--py, 0px), 0) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
                transformStyle: "preserve-3d",
                willChange: "transform",
            }}
            aria-hidden="true"
        >
            {/* Deep base (cinematic black + warm highlights) */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "radial-gradient(1200px 700px at 50% 8%, rgba(255,255,255,0.06), transparent 62%)," +
                        "radial-gradient(1100px 760px at 16% 88%, rgba(244,63,94,0.14), transparent 56%)," +
                        "radial-gradient(980px 700px at 88% 78%, rgba(245,158,11,0.16), transparent 58%)," +
                        "radial-gradient(900px 600px at 58% 36%, rgba(110,231,183,0.11), transparent 60%)," +
                        "linear-gradient(180deg, rgba(5,7,12,1), rgba(5,7,12,0.92))",
                }}
            />

            {/* Slow aurora drift (background-position animation, super smooth) */}
            <div className="lifee-aurora absolute inset-0 opacity-[0.65]" />

            {/* SVG “liquid aurora” + ribbons */}
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                <defs>
                    <filter id="lifeeLiquid" x="-30%" y="-30%" width="160%" height="160%">
                        <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" result="noise" />
                        <feDisplacementMap ref={disp} in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
                        <feGaussianBlur stdDeviation="22" />
                    </filter>

                    <radialGradient id="gRose" cx="30%" cy="25%" r="65%">
                        <stop offset="0%" stopColor="rgba(244,63,94,0.58)" />
                        <stop offset="65%" stopColor="rgba(244,63,94,0.10)" />
                        <stop offset="100%" stopColor="rgba(244,63,94,0)" />
                    </radialGradient>

                    <radialGradient id="gAmber" cx="70%" cy="72%" r="72%">
                        <stop offset="0%" stopColor="rgba(245,158,11,0.60)" />
                        <stop offset="65%" stopColor="rgba(245,158,11,0.12)" />
                        <stop offset="100%" stopColor="rgba(245,158,11,0)" />
                    </radialGradient>

                    <radialGradient id="gMint" cx="55%" cy="45%" r="70%">
                        <stop offset="0%" stopColor="rgba(110,231,183,0.36)" />
                        <stop offset="70%" stopColor="rgba(110,231,183,0.08)" />
                        <stop offset="100%" stopColor="rgba(110,231,183,0)" />
                    </radialGradient>

                    <radialGradient id="gIce" cx="45%" cy="55%" r="70%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                        <stop offset="60%" stopColor="rgba(255,255,255,0.06)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>

                    <linearGradient id="gRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(244,63,94,0)" />
                        <stop offset="35%" stopColor="rgba(244,63,94,0.36)" />
                        <stop offset="60%" stopColor="rgba(245,158,11,0.36)" />
                        <stop offset="80%" stopColor="rgba(110,231,183,0.26)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>

                    <linearGradient id="gRibbon2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="40%" stopColor="rgba(255,255,255,0.18)" />
                        <stop offset="65%" stopColor="rgba(110,231,183,0.22)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>

                    <linearGradient id="gRibbon3" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="30%" stopColor="rgba(245,158,11,0.16)" />
                        <stop offset="62%" stopColor="rgba(244,63,94,0.18)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                </defs>

                <g filter="url(#lifeeLiquid)" style={{ mixBlendMode: "screen", opacity: 0.98 }}>
                    <circle ref={blob1} cx="22%" cy="28%" r="270" fill="url(#gRose)" opacity="0.82" />
                    <circle ref={blob2} cx="78%" cy="76%" r="340" fill="url(#gAmber)" opacity="0.80" />
                    <circle ref={blob3} cx="62%" cy="20%" r="230" fill="url(#gMint)" opacity="0.66" />
                    <circle ref={blob4} cx="24%" cy="82%" r="300" fill="url(#gIce)" opacity="0.52" />
                    <circle ref={blob5} cx="54%" cy="56%" r="210" fill="url(#gRibbon2)" opacity="0.40" />
                </g>

                {/* Ribbons */}
                <g style={{ mixBlendMode: "screen", opacity: 0.74 }}>
                    <path
                        ref={ribbon1}
                        d="M -60 260 C 240 120, 520 520, 820 280 S 1300 70, 1600 330"
                        fill="none"
                        stroke="url(#gRibbon)"
                        strokeWidth="18"
                        strokeLinecap="round"
                        opacity="0.50"
                        filter="url(#lifeeLiquid)"
                    />
                    <path
                        ref={ribbon2}
                        d="M -60 520 C 260 720, 560 260, 900 520 S 1380 780, 1600 460"
                        fill="none"
                        stroke="url(#gRibbon2)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        opacity="0.44"
                        filter="url(#lifeeLiquid)"
                    />
                    <path
                        ref={ribbon3}
                        d="M -60 390 C 260 420, 540 220, 860 400 S 1320 560, 1600 360"
                        fill="none"
                        stroke="url(#gRibbon3)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        opacity="0.30"
                        filter="url(#lifeeLiquid)"
                    />
                </g>
            </svg>

            {/* Canvas atmosphere */}
            <canvas ref={canvasRef} className="absolute inset-0 opacity-[0.62]" />

            {/* Scanlines (super fine) */}
            <div className="lifee-scanlines absolute inset-0 opacity-[0.18] mix-blend-overlay" />

            {/* Film grain */}
            <div className="lifee-grain absolute inset-0 opacity-[0.18] mix-blend-overlay" />

            {/* Subtle vignette */}
            <div
                className="absolute inset-0"
                style={{
                    background: "radial-gradient(1200px 800px at 50% 35%, transparent 55%, rgba(0,0,0,0.62) 100%)",
                    opacity: 0.78,
                }}
            />

            {/* Letterbox bars (cinema) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[12vh] bg-gradient-to-b from-black/70 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[12vh] bg-gradient-to-t from-black/70 to-transparent" />

            <style jsx global>{`
        .lifee-aurora {
          background: radial-gradient(900px 520px at 20% 20%, rgba(244, 63, 94, 0.12), transparent 62%),
            radial-gradient(920px 560px at 80% 70%, rgba(245, 158, 11, 0.12), transparent 62%),
            radial-gradient(900px 540px at 55% 35%, rgba(110, 231, 183, 0.10), transparent 62%);
          background-size: 140% 140%;
          animation: lifeeAurora 10s ease-in-out infinite alternate;
          filter: blur(8px) saturate(1.05);
          transform: translate3d(0, 0, 0);
        }
        @keyframes lifeeAurora {
          0% {
            background-position: 0% 30%, 100% 70%, 50% 10%;
          }
          100% {
            background-position: 40% 0%, 60% 100%, 55% 70%;
          }
        }

        .lifee-grain {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          background-size: 180px 180px;
          animation: lifeeGrain 1.7s steps(2) infinite;
        }
        @keyframes lifeeGrain {
          0% {
            transform: translate3d(0, 0, 0);
          }
          25% {
            transform: translate3d(-2%, 2%, 0);
          }
          50% {
            transform: translate3d(2%, -1%, 0);
          }
          75% {
            transform: translate3d(-1%, -2%, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        .lifee-scanlines {
          background: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.05) 0px,
            rgba(255, 255, 255, 0.05) 1px,
            rgba(0, 0, 0, 0) 2px,
            rgba(0, 0, 0, 0) 6px
          );
          animation: lifeeScan 6s linear infinite;
          transform: translate3d(0, 0, 0);
        }
        @keyframes lifeeScan {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 120px;
          }
        }
      `}</style>
        </div>
    );
}

/** ----------------- Studio Opening (same API, far more cinematic) ----------------- */
export function StudioOpening({
                                  open = true,
                                  forceOpen = false,
                                  storageKey = "lifee_studio_intro_done_v1",
                                  durationMs = 4200,
                                  onDone,
                              }: Props) {
    const reduced = useReducedMotion();
    const [mounted, setMounted] = useState(false);
    const [show, setShow] = useState(false);
    const doneRef = useRef(false);

    useEffect(() => {
        setMounted(true);
        if (!open) return;

        if (forceOpen) {
            setShow(true);
            return;
        }

        try {
            const done = localStorage.getItem(storageKey) === "1";
            if (!done) setShow(true);
        } catch {
            setShow(true);
        }
    }, [open, forceOpen, storageKey]);

    useEffect(() => {
        if (!show) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [show]);

    const total = reduced ? 160 : durationMs;

    const finish = () => {
        if (doneRef.current) return;
        doneRef.current = true;

        try {
            localStorage.setItem(storageKey, "1");
        } catch {}

        setShow(false);

        // ✅ trigger for your TutorialOverlay deferOpen
        window.dispatchEvent(new Event("lifee:studio-intro-done"));
        onDone?.();
    };

    useEffect(() => {
        if (!show) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
                e.preventDefault();
                finish();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    useEffect(() => {
        if (!show) return;
        const t = window.setTimeout(finish, total);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, total]);

    const timings = useMemo(() => {
        const t = (p: number) => Math.round(total * p);
        return {
            // cinematic cadence
            flashIn: t(0.06),
            badgeIn: t(0.14),
            titleIn: t(0.20),
            subtitleIn: t(0.32),
            hudIn: t(0.44),
            sweepIn: t(0.52),
            wipeStart: t(0.66),
            fadeOut: t(0.84),
        };
    }, [total]);

    if (!mounted) return null;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 z-[10000] overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Introduction Lifee Studio"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.25 }}
                >
                    {/* Background */}
                    <CinematicBackdrop active={show} />

                    {/* Readability scrim + subtle chroma edge */}
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-screen [filter:blur(14px)]">
                        <div className="absolute inset-[-20%] bg-gradient-to-tr from-rose-500/10 via-transparent to-amber-400/10" />
                    </div>

                    {/* “Camera flash” at start */}
                    <motion.div
                        className="pointer-events-none absolute inset-0 bg-white"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduced ? 0 : 0.55, delay: timings.flashIn / 1000 }}
                        style={{ opacity: 0 }}
                    />

                    {/* Skip */}
                    <motion.button
                        onClick={finish}
                        initial={{ opacity: 0, y: -8, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ delay: timings.badgeIn / 1000, duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className={cx(
                            "absolute right-4 top-4 z-10",
                            "inline-flex items-center gap-2 rounded-full px-3 py-2",
                            "bg-white/10 text-white/90 ring-1 ring-white/10 hover:bg-white/15",
                            "backdrop-blur-md shadow-[0_20px_80px_rgba(0,0,0,.35)]",
                            "focus:outline-none focus:ring-2 focus:ring-rose-300/60"
                        )}
                        aria-label="Passer l’introduction"
                    >
                        <X className="h-4 w-4" />
                        <span className="text-xs font-semibold">Passer</span>
                        <span className="hidden md:inline text-[10px] text-white/55">Esc / Space</span>
                    </motion.button>

                    {/* Top-left REC + timecode vibes */}
                    <div className="absolute left-4 top-4 z-10 hidden md:flex items-center gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
              </span>
                            <span className="text-[11px] font-bold tracking-wide text-white/80">REC</span>
                            <span className="text-[11px] text-white/55 tabular-nums">LIFEE • STUDIO</span>
                        </div>
                    </div>

                    {/* Center content */}
                    <div className="absolute inset-0 grid place-items-center px-6">
                        <div className="w-full max-w-[820px]">
                            <motion.div
                                initial={{ opacity: 0, y: 12, filter: "blur(14px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{
                                    delay: timings.titleIn / 1000,
                                    duration: reduced ? 0 : 0.75,
                                    ease: [0.16, 1, 0.3, 1],
                                }}
                                className="text-center"
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                        delay: timings.badgeIn / 1000,
                                        duration: reduced ? 0 : 0.5,
                                        ease: [0.16, 1, 0.3, 1],
                                    }}
                                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-md"
                                >
                                    <Film className="h-4 w-4 text-rose-300" />
                                    <span className="text-[11px] font-semibold text-white/85">Lifee</span>
                                    <span className="h-1 w-1 rounded-full bg-white/30" />
                                    <span className="text-[11px] font-semibold text-white/85">Studio</span>
                                    <span className="h-1 w-1 rounded-full bg-white/20" />
                                    <span className="text-[11px] text-white/60">Opening</span>
                                </motion.div>

                                {/* Title with cinematic “chroma + glow” */}
                                <h1 className="mt-5 text-[42px] md:text-[62px] font-black tracking-tight text-white leading-[0.95]">
                  <span className="relative inline-block">
                    <span className="absolute inset-0 translate-x-[1px] translate-y-[1px] text-rose-300/35 blur-[1px]">
                      Lifee Studio
                    </span>
                    <span className="absolute inset-0 -translate-x-[1px] -translate-y-[1px] text-amber-200/25 blur-[1px]">
                      Lifee Studio
                    </span>
                    <span className="relative">Lifee Studio</span>
                  </span>
                                </h1>

                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        delay: timings.subtitleIn / 1000,
                                        duration: reduced ? 0 : 0.6,
                                        ease: [0.16, 1, 0.3, 1],
                                    }}
                                    className="mt-4 text-[14px] md:text-[16px] font-semibold text-white/75"
                                >
                                    Restitution du souvenir.
                                    <span className="text-white/55"> De la photo au film, avec une mise en scène ciné.</span>
                                </motion.p>

                                {/* Light sweep under title (subtle) */}
                                <motion.div
                                    className="mx-auto mt-6 h-px w-[320px] md:w-[420px] overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10"
                                    initial={{ opacity: 0, scaleX: 0.7 }}
                                    animate={{ opacity: 1, scaleX: 1 }}
                                    transition={{
                                        delay: timings.sweepIn / 1000,
                                        duration: reduced ? 0 : 0.65,
                                        ease: [0.16, 1, 0.3, 1],
                                    }}
                                >
                                    <motion.div
                                        className="h-full w-[40%]"
                                        style={{
                                            background:
                                                "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), rgba(110,231,183,0.20), transparent)",
                                        }}
                                        initial={{ x: "-120%" }}
                                        animate={{ x: "260%" }}
                                        transition={{ duration: reduced ? 0 : 1.2, ease: [0.2, 0.9, 0.2, 1] }}
                                    />
                                </motion.div>
                            </motion.div>

                            {/* micro HUD / montage */}
                            <motion.div
                                initial={{ opacity: 0, y: 18, filter: "blur(12px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{
                                    delay: timings.hudIn / 1000,
                                    duration: reduced ? 0 : 0.7,
                                    ease: [0.16, 1, 0.3, 1],
                                }}
                                className="mt-10 mx-auto w-full max-w-[620px]"
                            >
                                <div className="relative overflow-hidden rounded-3xl bg-white/10 ring-1 ring-white/12 backdrop-blur-md p-4 shadow-[0_30px_120px_rgba(0,0,0,.35)]">
                                    {/* tiny HUD grid */}
                                    <div className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay">
                                        <div
                                            className="absolute inset-0"
                                            style={{
                                                background:
                                                    "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                                                backgroundSize: "28px 28px",
                                            }}
                                        />
                                    </div>

                                    {/* scanning line */}
                                    <motion.div
                                        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
                                        style={{
                                            background:
                                                "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), rgba(245,158,11,0.22), transparent)",
                                            opacity: 0.55,
                                        }}
                                        initial={{ y: -10 }}
                                        animate={{ y: 140 }}
                                        transition={{
                                            delay: (timings.hudIn + 120) / 1000,
                                            duration: reduced ? 0 : 1.35,
                                            ease: [0.2, 0.9, 0.2, 1],
                                        }}
                                    />

                                    <div className="relative flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                                                <ImageIcon className="h-5 w-5 text-white/85" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-extrabold text-white/90 tracking-wide">IMPORT</div>
                                                <div className="text-[11px] text-white/55">Photo / vidéo source</div>
                                            </div>
                                        </div>

                                        <div className="text-white/40">→</div>

                                        <div className="flex items-center gap-3">
                                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                                                <Sparkles className="h-5 w-5 text-amber-200" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-extrabold text-white/90 tracking-wide">IA</div>
                                                <div className="text-[11px] text-white/55">Mise en scène</div>
                                            </div>
                                        </div>

                                        <div className="text-white/40">→</div>

                                        <div className="flex items-center gap-3">
                                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                                                <Film className="h-5 w-5 text-rose-200" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-extrabold text-white/90 tracking-wide">FILM</div>
                                                <div className="text-[11px] text-white/55">Export final</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* loading bar */}
                                    <div className="mt-5 h-2.5 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{
                                                background:
                                                    "linear-gradient(90deg, rgba(244,63,94,0.82), rgba(245,158,11,0.76), rgba(110,231,183,0.68))",
                                            }}
                                            initial={{ width: "8%", opacity: 0.9 }}
                                            animate={{ width: "100%", opacity: 1 }}
                                            transition={{
                                                delay: (timings.hudIn + 220) / 1000,
                                                duration: reduced ? 0 : 1.35,
                                                ease: [0.2, 0.9, 0.2, 1],
                                            }}
                                        />
                                    </div>

                                    <div className="mt-2 text-[11px] text-white/55 flex justify-between">
                                        <span>Préparation…</span>
                                        <span className="font-semibold text-white/70 tabular-nums">Boot • Assets • Timeline</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Cinematic wipe (curtain) */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ clipPath: "inset(0 0 0 0 round 0px)" }}
                        animate={{
                            clipPath: reduced ? "inset(0 0 0 0 round 0px)" : "inset(0 0 0 100% round 0px)",
                        }}
                        transition={{
                            delay: timings.wipeStart / 1000,
                            duration: reduced ? 0 : 1.05,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                        style={{
                            background:
                                "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.015), rgba(255,255,255,0.00))",
                        }}
                    />

                    {/* last fade to black before unmount */}
                    <motion.div
                        className="absolute inset-0 bg-black pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        exit={{
                            opacity: 1,
                            transition: { duration: reduced ? 0 : 0.2, delay: timings.fadeOut / 1000 },
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
