"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Film, Image as ImageIcon, Sparkles, X } from "lucide-react";

/**
 * pnpm add animejs
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

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

/** --------- Completely different style: kinetic geometry + flowfield + neon glass shards --------- */
function KineticGeometryBackdrop({ active }: { active: boolean }) {
    const reduced = useReducedMotion();

    const rootRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // pointer smoothing (shared)
    const ptr = useRef({ tx: 0, ty: 0, x: 0, y: 0 });

    // floating DOM “shards” animated by anime.js (very light)
    const shardEls = useRef<Array<HTMLDivElement | null>>([]);
    const setShardRef = (i: number) => (el: HTMLDivElement | null) => {
        shardEls.current[i] = el;
    };
// Canvas: flow-field + particles + strokes + ✅ metaballs morphing (low-res threshold)
    useEffect(() => {
        if (!active) return;
        const c = canvasRef.current;
        if (!c) return;

        const ctx = c.getContext("2d", { alpha: true });
        if (!ctx) return;

        const dpr = Math.min(2, window.devicePixelRatio || 1);

        let w = 0;
        let h = 0;
        let grad: CanvasGradient | null = null;

        // ---- metaballs (offscreen low-res) ----
        const mbCanvas = document.createElement("canvas");
        const mbCtx = mbCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
        if (!mbCtx) return;

        let mbW = 0;
        let mbH = 0;
        let mbGrad: CanvasGradient | null = null;

        type Ball = {
            x: number;
            y: number;
            r: number;
            vx: number;
            vy: number;
            ph: number;
            w: number;
        };
        let balls: Ball[] = [];

        // perf knobs
        const MB_FPS = 30; // update metaballs at 30fps
        const MB_CUTOFF = 118; // alpha threshold (higher = tighter blobs)
        let mbTimer = 0;

        const setupMetaballs = () => {
            const area = w * h;

            // low-res scale: smaller = faster, still looks good because we blur + upscale
            const base = clamp(0.38 - area / 6_500_000, 0.26, 0.40);
            mbW = Math.max(220, Math.floor(w * base));
            mbH = Math.max(160, Math.floor(h * base));

            mbCanvas.width = mbW;
            mbCanvas.height = mbH;

            mbGrad = mbCtx.createLinearGradient(0, 0, mbW, mbH);
            mbGrad.addColorStop(0, "rgba(120, 255, 214, 0.70)"); // mint
            mbGrad.addColorStop(0.45, "rgba(124, 92, 255, 0.62)"); // violet
            mbGrad.addColorStop(1, "rgba(255, 92, 173, 0.56)"); // pink

            const count = reduced ? 0 : Math.round(clamp(area / 230_000, 6, 10));
            const m = Math.min(mbW, mbH);

            balls = Array.from({ length: count }).map(() => {
                const r = rand(m * 0.09, m * 0.17);
                return {
                    x: rand(r, mbW - r),
                    y: rand(r, mbH - r),
                    r,
                    vx: rand(-0.06, 0.06) * 60, // px/s in low-res space
                    vy: rand(-0.05, 0.05) * 60,
                    ph: rand(0, Math.PI * 2),
                    w: rand(0.7, 1.25), // wobble factor
                };
            });

            // draw one initial frame so there is always something to upscale
            renderMetaballs(0);
        };

        const resize = () => {
            w = Math.max(1, Math.floor(window.innerWidth));
            h = Math.max(1, Math.floor(window.innerHeight));
            c.width = Math.floor(w * dpr);
            c.height = Math.floor(h * dpr);
            c.style.width = `${w}px`;
            c.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, "rgba(120, 255, 214, 0.22)");
            grad.addColorStop(0.45, "rgba(124, 92, 255, 0.18)");
            grad.addColorStop(1, "rgba(255, 92, 173, 0.16)");

            setupMetaballs();
        };

        const renderMetaballs = (dtMs: number) => {
            if (reduced || balls.length === 0) return;

            // --- update ---
            const dt = Math.min(40, dtMs) / 1000; // seconds
            const m = Math.min(mbW, mbH);

            // pointer influence (subtle)
            const mx = (0.5 + ptr.current.x * 0.18) * mbW;
            const my = (0.5 + ptr.current.y * 0.14) * mbH;

            for (const b of balls) {
                b.ph += dt * 1.2 * b.w;

                // gentle attraction to pointer
                const dx = mx - b.x;
                const dy = my - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy) + 1e-6;
                const att = (0.55 / (0.35 + dist / m)) * 0.22; // tuned
                b.vx += (dx / dist) * att * 60 * dt;
                b.vy += (dy / dist) * att * 60 * dt;

                // wobble to avoid “too uniform”
                b.vx += Math.sin(b.ph) * 6 * dt;
                b.vy += Math.cos(b.ph * 0.9) * 6 * dt;

                // damping
                b.vx *= 0.992;
                b.vy *= 0.992;

                b.x += b.vx * dt;
                b.y += b.vy * dt;

                // bounce
                if (b.x < b.r) {
                    b.x = b.r;
                    b.vx *= -0.9;
                } else if (b.x > mbW - b.r) {
                    b.x = mbW - b.r;
                    b.vx *= -0.9;
                }
                if (b.y < b.r) {
                    b.y = b.r;
                    b.vy *= -0.9;
                } else if (b.y > mbH - b.r) {
                    b.y = mbH - b.r;
                    b.vy *= -0.9;
                }
            }

            // --- draw blurred fields ---
            mbCtx.clearRect(0, 0, mbW, mbH);
            mbCtx.globalCompositeOperation = "lighter";

            // blur size relative to resolution (keeps “merge” consistent)
            const blur = clamp((m * 0.035), 10, 18);
            mbCtx.filter = `blur(${blur}px)`;

            for (const b of balls) {
                // a bit of radius breathing makes merges feel alive
                const rr = b.r * (0.92 + 0.12 * Math.sin(b.ph));
                mbCtx.fillStyle = "rgba(255,255,255,0.92)";
                mbCtx.beginPath();
                mbCtx.arc(b.x, b.y, rr, 0, Math.PI * 2);
                mbCtx.fill();
            }

            mbCtx.filter = "none";

            // --- threshold -> metaball silhouette ---
            const img = mbCtx.getImageData(0, 0, mbW, mbH);
            const data = img.data;

            for (let i = 0; i < data.length; i += 4) {
                const a = data[i + 3];
                if (a > MB_CUTOFF) {
                    // stronger edge by amplifying above cutoff
                    const na = clamp((a - MB_CUTOFF) * 3.0, 0, 255);
                    data[i] = 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                    data[i + 3] = na;
                } else {
                    data[i + 3] = 0;
                }
            }

            mbCtx.putImageData(img, 0, 0);

            // colorize inside silhouette only
            if (mbGrad) {
                mbCtx.globalCompositeOperation = "source-in";
                mbCtx.fillStyle = mbGrad;
                mbCtx.fillRect(0, 0, mbW, mbH);
                mbCtx.globalCompositeOperation = "source-over";
            }
        };

        resize();
        window.addEventListener("resize", resize);

        const area = () => w * h;

        // particles / strokes (unchanged vibe)
        const particlesCount = reduced ? 0 : Math.round(clamp(area() / 70000, 16, 54));
        const particles = Array.from({ length: particlesCount }).map(() => ({
            x: rand(0, w),
            y: rand(0, h),
            r: rand(0.8, 2.4),
            a: rand(0.03, 0.10),
            vx: rand(-0.06, 0.06),
            vy: rand(-0.10, -0.03),
            t: rand(0, Math.PI * 2),
        }));

        const glassStrokesCount = reduced ? 0 : Math.round(clamp(area() / 420000, 2, 7));
        const strokes = Array.from({ length: glassStrokesCount }).map(() => ({
            x: rand(-w * 0.2, w * 1.2),
            y: rand(h * 0.12, h * 0.88),
            len: rand(180, 520),
            a: rand(0.025, 0.06),
            v: rand(0.10, 0.28),
            phase: rand(0, Math.PI * 2),
            lw: rand(1, 2),
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

            // base clear
            ctx.clearRect(0, 0, w, h);

            // subtle haze
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "rgba(255,255,255,0.012)";
            ctx.fillRect(0, 0, w, h);

            // ✅ metaballs layer (cached at ~30fps)
            mbTimer += dt;
            const mbStep = 1000 / MB_FPS;
            if (mbTimer >= mbStep) {
                renderMetaballs(mbTimer);
                mbTimer = 0;
            }

            if (!reduced && balls.length) {
                ctx.save();
                ctx.globalCompositeOperation = "screen";
                ctx.globalAlpha = 0.62;
                ctx.drawImage(mbCanvas, 0, 0, mbW, mbH, 0, 0, w, h);
                ctx.restore();
            }

            // FLOWFIELD LINES (as before)
            const px = ptr.current.x;
            const py = ptr.current.y;
            const t = now * 0.00035;

            const lineDensity = clamp(area() / 520000, 1, 2.3);
            const spacing = Math.round(46 / lineDensity);

            ctx.globalCompositeOperation = "lighter";
            ctx.lineCap = "round";
            ctx.strokeStyle = grad || "rgba(255,255,255,0.12)";
            ctx.globalAlpha = 0.62;

            const startX = -spacing;
            const startY = -spacing;
            const endX = w + spacing;
            const endY = h + spacing;

            for (let y = startY; y <= endY; y += spacing) {
                for (let x = startX; x <= endX; x += spacing) {
                    const nx = x / Math.max(1, w);
                    const ny = y / Math.max(1, h);

                    const a1 = Math.sin(nx * 6.0 + t * 1.7 + px * 0.65);
                    const a2 = Math.cos(ny * 5.2 - t * 1.3 + py * 0.55);
                    const ang = (a1 + a2) * 1.35;

                    const len = 10 + 7 * (0.5 + 0.5 * Math.sin(t * 2 + nx * 8 + ny * 7));
                    const dx = Math.cos(ang) * len;
                    const dy = Math.sin(ang) * len;

                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + dx, y + dy);
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;

            // NEON PARTICLES
            ctx.globalCompositeOperation = "lighter";
            for (const p of particles) {
                p.t += dt * 0.0015;
                p.x += p.vx * dt + Math.sin(p.t) * 0.02 * dt;
                p.y += p.vy * dt + Math.cos(p.t * 0.9) * 0.015 * dt;

                if (p.x < -30) p.x = w + 30;
                if (p.x > w + 30) p.x = -30;
                if (p.y < -30) p.y = h + 30;

                const alpha = p.a * (0.7 + 0.3 * Math.sin(p.t));
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }

            // GLASS STROKES
            ctx.globalCompositeOperation = "lighter";
            for (const s of strokes) {
                s.phase += dt * 0.0011;
                s.x += s.v * dt;
                if (s.x > w + s.len + 140) {
                    s.x = -s.len - 140;
                    s.y = rand(h * 0.1, h * 0.9);
                }

                const pulse = 0.55 + 0.45 * Math.sin(s.phase);
                const a = s.a * pulse;

                const g = ctx.createLinearGradient(s.x, s.y, s.x + s.len, s.y);
                g.addColorStop(0, "rgba(255,255,255,0)");
                g.addColorStop(0.25, `rgba(255,255,255,${a})`);
                g.addColorStop(0.65, `rgba(140,255,220,${a * 0.55})`);
                g.addColorStop(1, "rgba(255,255,255,0)");

                ctx.strokeStyle = g;
                ctx.lineWidth = s.lw;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x + s.len, s.y);
                ctx.stroke();
            }

            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
        };

        if (!reduced) raf = requestAnimationFrame(tick);
        else {
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = "rgba(255,255,255,0.012)";
            ctx.fillRect(0, 0, w, h);
        }

        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [active, reduced]);

    useEffect(() => {
        if (!active) return;
        const el = rootRef.current;
        if (!el) return;

        if (reduced) {
            el.style.setProperty("--px", "0px");
            el.style.setProperty("--py", "0px");
            el.style.setProperty("--tiltX", "0deg");
            el.style.setProperty("--tiltY", "0deg");
            return;
        }

        let raf = 0;

        const onMove = (e: PointerEvent) => {
            const w = window.innerWidth || 1;
            const h = window.innerHeight || 1;
            const nx = (e.clientX / w) * 2 - 1;
            const ny = (e.clientY / h) * 2 - 1;
            ptr.current.tx = nx;
            ptr.current.ty = ny;
            if (!raf) raf = requestAnimationFrame(loop);
        };

        const loop = () => {
            raf = 0;
            const p = ptr.current;
            p.x = lerp(p.x, p.tx, 0.08);
            p.y = lerp(p.y, p.ty, 0.08);

            const px = clamp(p.x * 14, -14, 14);
            const py = clamp(p.y * 10, -10, 10);

            const tiltY = clamp(p.x * 2.2, -2.2, 2.2);
            const tiltX = clamp(-p.y * 1.8, -1.8, 1.8);

            el.style.setProperty("--px", `${px}px`);
            el.style.setProperty("--py", `${py}px`);
            el.style.setProperty("--tiltX", `${tiltX}deg`);
            el.style.setProperty("--tiltY", `${tiltY}deg`);

            if (Math.abs(p.x - p.tx) > 0.002 || Math.abs(p.y - p.ty) > 0.002) {
                raf = requestAnimationFrame(loop);
            }
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        return () => {
            window.removeEventListener("pointermove", onMove);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [active, reduced]);




    return (
        <div
            ref={rootRef}
            className="absolute inset-0 overflow-hidden"
            style={{
                transform:
                    "translate3d(var(--px, 0px), var(--py, 0px), 0) rotateX(var(--tiltX,0deg)) rotateY(var(--tiltY,0deg))",
                transformStyle: "preserve-3d",
                willChange: "transform",
            }}
            aria-hidden="true"
        >
            {/* Base: deep ink + cold neon corner glow (no “cinema” look) */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "radial-gradient(900px 680px at 12% 18%, rgba(124,92,255,0.18), transparent 60%)," +
                        "radial-gradient(900px 680px at 88% 78%, rgba(120,255,214,0.14), transparent 58%)," +
                        "radial-gradient(860px 640px at 72% 18%, rgba(255,92,173,0.12), transparent 55%)," +
                        "linear-gradient(180deg, rgba(4,6,12,1), rgba(4,6,12,0.96))",
                }}
            />

            {/* Canvas flow + particles */}
            <canvas ref={canvasRef} className="absolute inset-0 opacity-[0.82]" />

            {/* Glass shards (DOM, cheap, animated) */}
            <div className="absolute inset-0">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div
                        key={i}
                        ref={setShardRef(i)}
                        className={cx(
                            "absolute rounded-[28px] will-change-transform",
                            "bg-white/5 ring-1 ring-white/10 backdrop-blur-md",
                            "shadow-[0_40px_140px_rgba(0,0,0,.35)]"
                        )}
                        style={{
                            left: `${rand(6, 88)}%`,
                            top: `${rand(8, 84)}%`,
                            width: `${Math.round(rand(140, 320))}px`,
                            height: `${Math.round(rand(80, 220))}px`,
                            transform: `rotate(${Math.round(rand(-18, 18))}deg)`,
                            // iridescent border
                            background:
                                "linear-gradient(120deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                            borderImage:
                                "linear-gradient(120deg, rgba(120,255,214,0.35), rgba(124,92,255,0.28), rgba(255,92,173,0.26)) 1",
                            borderWidth: 1,
                            borderStyle: "solid",
                            filter: "saturate(1.1)",
                            mixBlendMode: "screen",
                            opacity: 0.35,
                        }}
                    >
                        {/* inner highlight */}
                        <div
                            className="absolute inset-0 rounded-[28px] opacity-[0.65]"
                            style={{
                                background:
                                    "radial-gradient(320px 180px at 20% 20%, rgba(255,255,255,0.14), transparent 60%)",
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Clean vignette for legibility */}
            <div
                className="absolute inset-0"
                style={{
                    background: "radial-gradient(1200px 800px at 50% 40%, transparent 52%, rgba(0,0,0,0.62) 100%)",
                    opacity: 0.9,
                }}
            />

            {/* Micro-noise (static, not film grain) */}
            <div className="lifee-micro-noise absolute inset-0 opacity-[0.10] mix-blend-overlay" />

            <style jsx global>{`
        .lifee-micro-noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='.32'/%3E%3C/svg%3E");
          background-size: 220px 220px;
          transform: translate3d(0, 0, 0);
        }
      `}</style>
        </div>
    );
}

/** ----------------- Studio Opening (same API, fully new art direction) ----------------- */
export function StudioOpening({
                                  open = true,
                                  forceOpen = false,
                                  storageKey = "lifee_studio_intro_done_v2",
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

    const total = reduced ? 180 : durationMs;

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
            badgeIn: t(0.10),
            titleIn: t(0.18),
            subIn: t(0.30),
            panelIn: t(0.44),
            progressIn: t(0.54),
            exitStart: t(0.78),
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
                    transition={{ duration: reduced ? 0 : 0.22 }}
                    onMouseDown={(e) => {
                        // optional: click outside to skip (only if background clicked)
                        if (e.target === e.currentTarget) finish();
                    }}
                >
                    <KineticGeometryBackdrop active={show} />

                    {/* readability scrim */}
                    <div className="absolute inset-0 bg-black/28" />

                    {/* Skip */}
                    <motion.button
                        onClick={finish}
                        initial={{ opacity: 0, y: -10, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ delay: timings.badgeIn / 1000, duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className={cx(
                            "absolute right-4 top-4 z-10",
                            "inline-flex items-center gap-2 rounded-full px-3 py-2",
                            "bg-white/8 text-white/90 ring-1 ring-white/12 hover:bg-white/12",
                            "backdrop-blur-md shadow-[0_20px_80px_rgba(0,0,0,.35)]",
                            "focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
                        )}
                        aria-label="Passer l’introduction"
                    >
                        <X className="h-4 w-4" />
                        <span className="text-xs font-semibold">Passer</span>
                        <span className="hidden md:inline text-[10px] text-white/55">Esc / Space</span>
                    </motion.button>

                    {/* Center content (editorial + futuristic, no “cinema HUD”) */}
                    <div className="absolute inset-0 grid place-items-center px-6">
                        <div className="w-full max-w-[980px]">
                            {/* badge */}
                            <motion.div
                                initial={{ opacity: 0, y: 12, filter: "blur(14px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{ delay: timings.badgeIn / 1000, duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="flex justify-center"
                            >
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/12 backdrop-blur-md">
                                    <Sparkles className="h-4 w-4 text-emerald-200" />
                                    <span className="text-[11px] font-semibold text-white/85">Lifee</span>
                                    <span className="h-1 w-1 rounded-full bg-white/25" />
                                    <span className="text-[11px] font-semibold text-white/85">Studio</span>
                                    <span className="h-1 w-1 rounded-full bg-white/18" />
                                    <span className="text-[11px] text-white/60">Kinetic Opening</span>
                                </div>
                            </motion.div>

                            {/* headline */}
                            <motion.div
                                initial={{ opacity: 0, y: 16, filter: "blur(18px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{ delay: timings.titleIn / 1000, duration: reduced ? 0 : 0.75, ease: [0.16, 1, 0.3, 1] }}
                                className="mt-6 text-center"
                            >
                                <h1 className="text-[44px] md:text-[72px] font-black tracking-tight text-white leading-[0.95]">
                  <span className="relative inline-block">
                    {/* chroma edge, but clean */}
                      <span className="absolute inset-0 translate-x-[1px] translate-y-[1px] text-emerald-200/18 blur-[1px]">
                      Lifee Studio
                    </span>
                    <span className="absolute inset-0 -translate-x-[1px] -translate-y-[1px] text-violet-300/16 blur-[1px]">
                      Lifee Studio
                    </span>
                    <span className="relative">Lifee Studio</span>
                  </span>
                                </h1>

                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: timings.subIn / 1000, duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
                                    className="mt-4 text-[14px] md:text-[16px] font-semibold text-white/72"
                                >
                                    Monte une scène propre.
                                    <br/>
                                    <span className="text-white/52"> Profondeur, mouvements, rythme — export en un film.</span>
                                </motion.p>

                                {/* animated underline (different vibe) */}
                                <motion.div
                                    className="mx-auto mt-7 h-[2px] w-[340px] md:w-[460px] overflow-hidden rounded-full bg-white/10 ring-1 ring-white/12"
                                    initial={{ opacity: 0, scaleX: 0.8 }}
                                    animate={{ opacity: 1, scaleX: 1 }}
                                    transition={{ delay: (timings.subIn + 180) / 1000, duration: reduced ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <motion.div
                                        className="h-full w-[42%]"
                                        style={{
                                            background:
                                                "linear-gradient(90deg, transparent, rgba(120,255,214,0.55), rgba(124,92,255,0.45), rgba(255,92,173,0.40), transparent)",
                                        }}
                                        initial={{ x: "-120%" }}
                                        animate={{ x: "260%" }}
                                        transition={{ duration: reduced ? 0 : 1.25, ease: [0.2, 0.9, 0.2, 1] }}
                                    />
                                </motion.div>
                            </motion.div>

                            {/* panel (process cards) */}
                            <motion.div
                                initial={{ opacity: 0, y: 18, filter: "blur(14px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{ delay: timings.panelIn / 1000, duration: reduced ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
                                className="mt-10 mx-auto w-full max-w-[760px]"
                            >
                                <div className="relative overflow-hidden rounded-3xl bg-white/7 ring-1 ring-white/12 backdrop-blur-md p-4 shadow-[0_30px_140px_rgba(0,0,0,.40)]">
                                    {/* soft gradient wash */}
                                    <div className="pointer-events-none absolute inset-0 opacity-[0.55]">
                                        <div className="absolute inset-[-30%] bg-gradient-to-tr from-emerald-300/12 via-transparent to-violet-400/10" />
                                    </div>

                                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/8 ring-1 ring-white/10">
                                                    <ImageIcon className="h-5 w-5 text-white/85" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-extrabold text-white/90 tracking-wide">IMPORT</div>
                                                    <div className="text-[11px] text-white/55">source</div>
                                                </div>
                                            </div>
                                            <div className="mt-3 text-[12px] text-white/60">
                                                Une image suffit. Le reste, c’est du mouvement.
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/8 ring-1 ring-white/10">
                                                    <Sparkles className="h-5 w-5 text-emerald-200" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-extrabold text-white/90 tracking-wide">DIRECTION</div>
                                                    <div className="text-[11px] text-white/55">mise en scène</div>
                                                </div>
                                            </div>
                                            <div className="mt-3 text-[12px] text-white/60">
                                                Parallax, lumière, intention — tout est réglable.
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/8 ring-1 ring-white/10">
                                                    <Film className="h-5 w-5 text-pink-200" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-extrabold text-white/90 tracking-wide">RENDER</div>
                                                    <div className="text-[11px] text-white/55">export</div>
                                                </div>
                                            </div>
                                            <div className="mt-3 text-[12px] text-white/60">
                                                Un rendu fluide, prêt à partager.
                                            </div>
                                        </div>
                                    </div>

                                    {/* progress line */}
                                    <div className="relative mt-4 h-2.5 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/12">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{
                                                background:
                                                    "linear-gradient(90deg, rgba(120,255,214,0.85), rgba(124,92,255,0.78), rgba(255,92,173,0.70))",
                                            }}
                                            initial={{ width: "6%", opacity: 0.9 }}
                                            animate={{ width: "100%", opacity: 1 }}
                                            transition={{
                                                delay: timings.progressIn / 1000,
                                                duration: reduced ? 0 : 1.25,
                                                ease: [0.2, 0.9, 0.2, 1],
                                            }}
                                        />
                                    </div>

                                    <div className="relative mt-2 text-[11px] text-white/55 flex justify-between">
                                        <span>Initialisation…</span>
                                        <span className="font-semibold text-white/70 tabular-nums">Core • UI • Timeline</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* exit: clean fade (no curtain wipe) */}
                    <motion.div
                        className="absolute inset-0 bg-black pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        exit={{
                            opacity: 1,
                            transition: { duration: reduced ? 0 : 0.22, delay: timings.exitStart / 1000 },
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
