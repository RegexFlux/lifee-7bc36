// components/landing/ShowCase.tsx (ou ton chemin)
// ⚠️ pas besoin de "use client" en pages router

import React from "react";
import dynamic from "next/dynamic";
import {Wand2, Play} from "lucide-react";

// ⬇️ client-only (évite mismatch si VideoPlayer touche au DOM)
const VideoPlayer = dynamic(
    () => import("@/components/video/VideoPlayer").then((m) => m.VideoPlayer),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-black flex items-center justify-center text-white/60 text-xs">
                Chargement…
            </div>
        ),
    }
);

export default function ShowCase() {
    return (
        <section
            className="relative overflow-hidden border-t border-stone-200 bg-gradient-to-b from-stone-50 via-white to-stone-50 py-24">
            {/* Décor de fond */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl"/>
                <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl"/>
                <div
                    className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>
            </div>

            <div className="relative mx-auto max-w-7xl px-6">
                {/* Header */}
                <div className="mx-auto mb-16 max-w-2xl text-center">
                    <div
                        className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600 shadow-sm backdrop-blur">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400"/>
                        Processus en 3 étapes
                    </div>

                    <h2 className="text-3xl md:text-4xl font-serif text-stone-900">
                        De la photo au film, en un clin d&apos;œil
                    </h2>
                    <p className="mt-3 text-stone-500 text-lg">
                        Une transformation magique orchestrée par notre IA.
                    </p>
                </div>

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

                                        src="examples/showcase/image.jpg"
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

                                        src="examples/showcase/image.jpg"
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

                                        src="examples/showcase/image.jpg"
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

                    {/* ARROW 1 */}
                    <div className="hidden lg:block w-28 h-14 opacity-40">
                        <svg viewBox="0 0 120 60"
                             className="w-full h-full text-stone-400 fill-none stroke-current stroke-2"
                             style={{strokeDasharray: "6,4"}}>
                            <path d="M10,30 Q60,-10 110,30" markerEnd="url(#arrowheadProcess)"/>
                        </svg>
                    </div>

                    {/* STEP 2: STUDIO MOCKUP */}
                    <div className="relative group">
                        <div
                            className={["relative w-80 h-56 rounded-2xl border border-stone-200 bg-white shadow-2xl overflow-hidden",
                                "transition-transform duration-500 will-change-transform group-hover:scale-[1.03]"].join(" ")}>
                            <div
                                className="h-9 bg-gradient-to-b from-stone-50 to-white border-b border-stone-100 flex items-center px-3 gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-300"/>
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-300"/>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-300"/>
                                <div className="ml-3 h-2.5 w-20 rounded bg-stone-100"/>
                            </div>

                            <div className="flex h-[calc(100%-36px)]">
                                <div
                                    className="w-14 bg-stone-50 border-r border-stone-100 flex flex-col items-center py-3 gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-stone-200/60"/>
                                    <div className="w-8 h-8 rounded-xl bg-stone-200/40"/>
                                    <div className="w-8 h-8 rounded-xl bg-stone-200/40"/>
                                </div>

                                <div className="flex-1 flex flex-col p-2 gap-2">
                                    <div
                                        className="flex-1 rounded-xl border border-stone-100 bg-gradient-to-br from-stone-100 to-white relative overflow-hidden flex items-center justify-center">
                                        <div
                                            className="absolute inset-0 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>
                                        <div
                                            className="absolute inset-0 bg-gradient-to-tr from-rose-100/30 to-amber-100/30"/>
                                        <Wand2 size={34} className="relative text-stone-300 animate-pulse"/>
                                    </div>

                                    <div
                                        className="h-11 rounded-xl border border-stone-100 bg-white flex items-center px-2 gap-1 overflow-hidden relative">
                                        <div className="absolute left-2 right-2 h-[1px] bg-stone-200 top-1/2"/>
                                        <div
                                            className="h-7 w-16 bg-rose-100 border border-rose-200 rounded-lg relative z-10"/>
                                        <div
                                            className="h-7 w-12 bg-amber-100 border border-amber-200 rounded-lg relative z-10"/>
                                        <div
                                            className="h-7 w-20 bg-rose-100 border border-rose-200 rounded-lg relative z-10"/>
                                        <div className="ml-auto text-[10px] font-mono text-stone-400">render • 12s</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 text-center">
              <span
                  className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-stone-200 px-3 py-1 text-sm text-stone-600 shadow-sm">
                <span className="font-serif italic text-stone-500">Le Studio</span>
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
                            <VideoPlayer videoUrl={"/examples/showcase/result.mp4"}/>

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
