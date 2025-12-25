// components/landing/ShowCase.tsx (ou ton chemin)
// ⚠️ pas besoin de "use client" en pages router

import React from "react";
import dynamic from "next/dynamic";
import {Wand2, Play} from "lucide-react";

// ⬇️ client-only (évite mismatch si VideoPlayer touche au DOM)
const VideoPlayer = dynamic(
    () => import("@/components/VideoPlayer").then((m) => m.VideoPlayer),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-black flex items-center justify-center text-white/60 text-xs">
                Chargement…
            </div>
        ),
    }
);

export default function AlbumShowCase(params?: {
    videoUrl?: string;
    thumbnailUrl?: string;
}) {
    const polaroidUrl = params?.thumbnailUrl ?? "examples/showcase/image.jpg";
    return (
        <section
            className="relative overflow-hidden border-t border-stone-200 bg-gradient-to-b from-stone-50 via-white to-stone-50 py-8">

            <div className="relative mx-auto max-w-7xl px-6">
                <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-8">
                    {/* STEP 1: POLAROIDS */}
                    <div className="relative group [perspective:900px]">
                        <div className="relative h-64 w-52">
                            <div
                                className={["absolute inset-0 w-48 h-60 bg-white p-3 pb-12 shadow-md border border-stone-200 rounded-xl rotate-[-8deg]",
                                    "transition-all duration-500 will-change-transform",
                                    "group-hover:rotate-[-16deg] group-hover:-translate-x-10 group-hover:scale-95"].join(" ")}>
                                <div className="w-full h-full overflow-hidden rounded-lg bg-stone-200">
                                    <img
                                        src={polaroidUrl}
                                        className="w-full h-full object-cover grayscale opacity-60"
                                        alt="Souvenir photo 1"
                                    />
                                </div>
                            </div>

                            <div
                                className={["absolute inset-0 w-48 h-60 bg-white p-3 pb-12 shadow-lg border border-stone-200 rounded-xl rotate-[2deg] z-10",
                                    "transition-all duration-500 will-change-transform",
                                    "group-hover:rotate-[0deg] group-hover:-translate-y-5 group-hover:scale-100"].join(" ")}>
                                <div className="w-full h-full overflow-hidden rounded-lg bg-stone-200">
                                    <img

                                        src={polaroidUrl}
                                        className="w-full h-full object-cover grayscale opacity-80"
                                        alt="Souvenir photo 2"
                                    />
                                </div>
                            </div>

                            <div
                                className={["absolute inset-0 w-48 h-60 bg-white p-3 pb-12 shadow-xl border border-stone-200 rounded-xl rotate-[9deg] z-20",
                                    "transition-all duration-500 will-change-transform",
                                    "group-hover:rotate-[16deg] group-hover:translate-x-10 group-hover:scale-105"].join(" ")}>
                                <div className="w-full h-full overflow-hidden rounded-lg bg-stone-200">
                                    <img

                                        src={polaroidUrl}
                                        className="w-full h-full object-cover grayscale"
                                        alt="Souvenir photo 3"
                                    />
                                </div>

                                <div className="mt-3 text-center text-[11px] tracking-wide text-stone-400 font-mono">
                                    3 souvenirs importés
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 text-center">
              <span
                  className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-stone-200 px-3 py-1 text-sm text-stone-600 shadow-sm">
                <span className="font-serif italic text-stone-500">Vos souvenirs</span>
              </span>
                        </div>
                    </div>

                    {/* ARROW 2 */}
                    <div className="hidden lg:block w-28 h-14 opacity-40">
                        <svg viewBox="0 0 120 60"
                             className="w-full h-full text-stone-400 fill-none stroke-current stroke-2"
                             style={{strokeDasharray: "6,4"}}>
                            <path d="M10,30 Q60,70 110,30" markerEnd="url(#arrowheadProcess)"/>
                        </svg>
                    </div>

                    {/* STEP 3: RESULT PLAYER */}
                    <div className="relative group">
                        <div
                            className={["relative w-72 h-96 rounded-2xl bg-black shadow-2xl shadow-rose-200/40 border-[6px] border-white overflow-hidden",
                                "transition-transform duration-500 will-change-transform group-hover:scale-[1.03] cursor-pointer"].join(" ")}>
                            <VideoPlayer
                                showControls={false}
                                videoUrl={params?.videoUrl ?? "http://localhost:3000/examples/showcase/result.mp4"}/>

                            <div
                                className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10"/>
                            <div
                                className="absolute inset-0 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>

                            <div
                                className="absolute bottom-3 left-3 text-[10px] text-white/90 font-mono bg-black/40 backdrop-blur px-2 py-1 rounded">
                                HD • 1984
                            </div>
                        </div>

                        <div className="mt-4 text-center">
              <span
                  className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-stone-200 px-3 py-1 text-sm text-stone-600 shadow-sm">
                <span className="font-serif italic text-stone-500">L&apos;Émotion</span>
              </span>
                        </div>
                    </div>

                    {/* SVG Marker Definition */}
                    <svg className="absolute w-0 h-0" aria-hidden="true">
                        <defs>
                            <marker id="arrowheadProcess" markerWidth="10" markerHeight="7" refX="9" refY="3.5"
                                    orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#a8a29e"/>
                            </marker>
                        </defs>
                    </svg>
                </div>

                <p className="mt-10 text-center text-xs text-stone-400 lg:hidden">
                    Astuce : touchez chaque carte pour voir l’effet “avant → après”.
                </p>
            </div>
        </section>
    );
}
