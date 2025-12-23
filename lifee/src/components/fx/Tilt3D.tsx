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

export function Tilt3D(props: {
    children: React.ReactNode;
    className?: string;
    intensity?: number; // deg
    shine?: boolean;
}) {
    const reduced = usePrefersReducedMotion();
    const ref = React.useRef<HTMLDivElement | null>(null);
    const raf = React.useRef<number | null>(null);

    const intensity = props.intensity ?? 7;

    React.useEffect(() => {
        if (reduced) return;

        const el = ref.current;
        if (!el) return;

        let rx = 0;
        let ry = 0;
        let tx = 0;
        let ty = 0;

        const apply = () => {
            // easing
            rx += (tx - rx) * 0.08;
            ry += (ty - ry) * 0.08;

            el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
            raf.current = requestAnimationFrame(apply);
        };

        const onMove = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / Math.max(1, r.width);
            const py = (e.clientY - r.top) / Math.max(1, r.height);
            ty = (px - 0.5) * intensity;
            tx = -(py - 0.5) * intensity;
            el.style.setProperty("--mx", String(px));
            el.style.setProperty("--my", String(py));
        };

        const onLeave = () => {
            tx = 0;
            ty = 0;
        };

        el.addEventListener("pointermove", onMove, { passive: true });
        el.addEventListener("pointerleave", onLeave);
        raf.current = requestAnimationFrame(apply);

        return () => {
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerleave", onLeave);
            if (raf.current) cancelAnimationFrame(raf.current);
        };
    }, [reduced, intensity]);

    return (
        <div
            ref={ref}
            className={[
                "relative will-change-transform transform-gpu",
                "transition-shadow duration-300",
                props.className ?? "",
            ].join(" ")}
            style={{
                transformStyle: "preserve-3d",
            }}
        >
            {props.children}

            {props.shine !== false ? (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity duration-300"
                    style={{
                        background:
                            "radial-gradient(400px circle at calc(var(--mx,0.5) * 100%) calc(var(--my,0.5) * 100%), rgba(255,255,255,0.35), rgba(255,255,255,0) 55%)",
                    }}
                />
            ) : null}

            <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          div { transform: none !important; }
        }
      `}</style>
        </div>
    );
}
