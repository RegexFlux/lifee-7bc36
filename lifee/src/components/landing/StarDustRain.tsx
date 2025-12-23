"use client";

import React, { useEffect, useMemo, useState } from "react";

type Particle = {
    id: string;
    left: number;      // %
    top: number;       // %
    size: number;      // px
    opacity: number;   // 0..1
    dur: number;       // s
    delay: number;     // s
    drift: number;     // px
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function uid() {
    // stable enough for our use (generated only client-side)
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function StarDustRain(props: {
    className?: string;
    density?: number; // 0.5..2 (1 = normal)
}) {
    const density = props.density ?? 1.6; // ↑ par défaut: plus de particules
    const [mounted, setMounted] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Important: on ne génère rien tant qu'on n'est pas monté (évite SSR mismatch)
    useEffect(() => {
        if (!mounted) return;

        const isMobile = window.matchMedia?.("(max-width: 640px)")?.matches ?? false;

        // Beaucoup de particules mais sans tuer le perf
        const base = isMobile ? 70 : 140;
        const count = Math.round(base * clamp(density, 0.5, 2.5));

        const next: Particle[] = Array.from({ length: count }).map(() => {
            const size = 1 + Math.random() * (isMobile ? 2.2 : 3.2);
            return {
                id: uid(),
                left: Math.random() * 100,
                top: -10 - Math.random() * 120, // spawn au-dessus
                size,
                opacity: 0.35 + Math.random() * 0.55,
                dur: 6 + Math.random() * (isMobile ? 7 : 9),
                delay: Math.random() * 3.5,
                drift: (Math.random() - 0.5) * (isMobile ? 40 : 90),
            };
        });

        setParticles(next);
    }, [mounted, density]);

    // SSR + 1er rendu client: même HTML (container vide)
    if (!mounted) {
        return <div className={props.className} aria-hidden="true" />;
    }

    return (
        <div className={props.className} aria-hidden="true">
            {/* Keyframes local (évite de toucher tailwind config) */}
            <style>{`
        @keyframes lifee-dust-fall {
          0%   { transform: translate3d(var(--dx), -10vh, 0); opacity: 0; }
          10%  { opacity: var(--op); }
          100% { transform: translate3d(calc(var(--dx) * -1), 115vh, 0); opacity: 0; }
        }
        @keyframes lifee-dust-twinkle {
          0%,100% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
          50%     { filter: drop-shadow(0 0 10px rgba(255,255,255,0.35)); }
        }
      `}</style>

            <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
                {particles.map((p) => (
                    <span
                        key={p.id}
                        className="absolute rounded-full"
                        style={{
                            left: `${p.left}%`,
                            top: `${p.top}%`,
                            width: `${p.size * 2}px`,
                            height: `${p.size *2 }px`,
                            background:
                                "radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0.35) 45%, rgba(255,255,255,0) 70%)",
                            // variables d'anim
                            ["--dx" as any]: `${p.drift}px`,
                            ["--op" as any]: p.opacity,
                            animation:
                                `lifee-dust-fall ${p.dur}s linear ${p.delay}s infinite, ` +
                                `lifee-dust-twinkle ${2.2 + Math.random() * 2.2}s ease-in-out ${Math.random()}s infinite`,
                            willChange: "transform, opacity",
                            opacity: p.opacity,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
