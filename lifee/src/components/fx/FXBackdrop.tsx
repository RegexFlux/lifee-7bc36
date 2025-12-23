"use client";

import React from "react";

function usePrefersReducedMotion() {
    const [reduced, setReduced] = React.useState(false);

    React.useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onChange = () => setReduced(mq.matches);
        onChange();
        mq.addEventListener?.("change", onChange);
        return () => mq.removeEventListener?.("change", onChange);
    }, []);

    return reduced;
}

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    a: number;
};

export default function FXBackdrop(props: { density?: number }) {
    const reduced = usePrefersReducedMotion();
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const rafRef = React.useRef<number | null>(null);
    const pointer = React.useRef({ x: 0.5, y: 0.5 });
    const particlesRef = React.useRef<Particle[]>([]);
    const density = props.density ?? 0.00006; // density par pixel (faible -> perf)

    React.useEffect(() => {
        if (reduced) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        let w = 0;
        let h = 0;
        let dpr = 1;

        const resize = () => {
            dpr = Math.min(2, window.devicePixelRatio || 1);
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const targetCount = Math.max(26, Math.min(110, Math.floor(w * h * density)));
            const arr = particlesRef.current;

            while (arr.length < targetCount) {
                arr.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.18,
                    vy: (Math.random() - 0.5) * 0.18,
                    r: 0.6 + Math.random() * 1.6,
                    a: 0.18 + Math.random() * 0.25,
                });
            }
            while (arr.length > targetCount) arr.pop();
        };

        const onPointerMove = (e: PointerEvent) => {
            pointer.current.x = e.clientX / Math.max(1, window.innerWidth);
            pointer.current.y = e.clientY / Math.max(1, window.innerHeight);
        };

        const onScroll = () => {
            // petite dérive verticale liée au scroll (subtile)
            // (pas obligatoire, mais nice)
        };

        resize();
        window.addEventListener("resize", resize);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("scroll", onScroll, { passive: true });

        let last = performance.now();

        const tick = (t: number) => {
            const dt = Math.min(33, t - last);
            last = t;

            ctx.clearRect(0, 0, w, h);

            // fond très léger (évite le “vide”)
            ctx.globalCompositeOperation = "source-over";

            const px = pointer.current.x;
            const py = pointer.current.y;

            const arr = particlesRef.current;

            // lignes + points
            for (let i = 0; i < arr.length; i++) {
                const p = arr[i];

                // drift vers le centre du pointeur (très subtil)
                p.vx += (px - 0.5) * 0.002;
                p.vy += (py - 0.5) * 0.002;

                p.x += p.vx * (dt / 16);
                p.y += p.vy * (dt / 16);

                // wrap
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10;
                if (p.y > h + 10) p.y = -10;

                // point
                ctx.beginPath();
                ctx.fillStyle = `rgba(120,113,108,${p.a})`; // stone-ish
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();

                // lien avec voisins proches (économie: check que quelques voisins)
                for (let j = i + 1; j < i + 7 && j < arr.length; j++) {
                    const q = arr[j];
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 < 120 * 120) {
                        const alpha = 0.10 * (1 - dist2 / (120 * 120));
                        ctx.strokeStyle = `rgba(168,162,158,${alpha})`; // stone-400-ish
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.stroke();
                    }
                }
            }

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            window.removeEventListener("resize", resize);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("scroll", onScroll);
        };
    }, [reduced, density]);

    return (
        <div className="pointer-events-none fixed inset-0 z-0">
            {/* Particules */}
            <canvas
                ref={canvasRef}
                className={reduced ? "hidden" : "absolute inset-0 opacity-70"}
                aria-hidden="true"
            />

            {/* Blobs + parallax (CSS only) */}
            <div className="absolute inset-0">
                <div className="absolute -top-24 -left-28 h-80 w-80 rounded-full bg-rose-200/30 blur-3xl lifee-float-1" />
                <div className="absolute -bottom-28 -right-28 h-[26rem] w-[26rem] rounded-full bg-amber-200/30 blur-3xl lifee-float-2" />
                <div className="absolute top-[20%] right-[10%] h-64 w-64 rounded-full bg-stone-200/25 blur-3xl lifee-float-3" />

                {/* grain */}
                <div className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                {/* vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_20%,rgba(0,0,0,0.05)_100%)]" />
            </div>

            {/* styles local (no config tailwind needed) */}
            <style jsx global>{`
        @keyframes lifeeFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(18px, -14px, 0) scale(1.03); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }
        .lifee-float-1 { animation: lifeeFloat 12s ease-in-out infinite; }
        .lifee-float-2 { animation: lifeeFloat 16s ease-in-out infinite; }
        .lifee-float-3 { animation: lifeeFloat 20s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lifee-float-1, .lifee-float-2, .lifee-float-3 { animation: none !important; }
        }
      `}</style>
        </div>
    );
}
