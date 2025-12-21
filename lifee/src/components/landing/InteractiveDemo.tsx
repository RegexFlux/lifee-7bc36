import React, { useEffect, useRef, useState } from "react";
import { Album, Layers, Play, Upload, Wand2 } from "lucide-react";

type DemoState = "idle" | "analyzing" | "generating" | "success";

type Props = {
    onDownloadClick: () => void;
};

export default function InteractiveDemo({ onDownloadClick }: Props) {
    const [demoState, setDemoState] = useState<DemoState>("idle");
    const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach((t) => clearTimeout(t));
            timeoutsRef.current = [];
        };
    }, []);

    const startDemo = () => {
        timeoutsRef.current.forEach((t) => clearTimeout(t));
        timeoutsRef.current = [];

        setDemoState("analyzing");
        timeoutsRef.current.push(setTimeout(() => setDemoState("generating"), 1500));
        timeoutsRef.current.push(setTimeout(() => setDemoState("success"), 4500));
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        startDemo();
    };

    return (
        <div className="relative group perspective-1000 lg:pl-10">
            <div className="absolute -left-12 -top-12 z-20 hidden lg:block pointer-events-none select-none">
                <svg className="absolute left-24 top-16 w-32 h-20 text-white z-30" viewBox="0 0 120 60" fill="none">
                    <path
                        d="M10 20 C 40 -10, 80 0, 100 30"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="animate-[draw_2s_ease-out_infinite]"
                        strokeDasharray="200"
                        strokeDashoffset="200"
                    />
                    <path
                        d="M99.5 22.0 L100 30 L92.8 26.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-[draw_2s_ease-out_infinite]"
                    />
                </svg>

                <div className="absolute left-40 top-10 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 transform -rotate-3 border border-cyan-500/30">
                    Generate
                </div>

                <div className="relative w-36 h-44 transform -rotate-6 transition-transform group-hover:-rotate-12 duration-500">
                    <div className="absolute inset-0 bg-slate-200 p-2 pb-8 shadow-2xl rounded transform -rotate-12 border border-slate-400">
                        <div className="w-full h-full bg-slate-300 overflow-hidden">
                            <img
                                src="https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400"
                                className="w-full h-full object-cover opacity-80 mix-blend-multiply"
                                alt="polaroid1"
                            />
                        </div>
                    </div>

                    <div className="absolute inset-0 bg-slate-100 p-2 pb-8 shadow-2xl rounded transform -rotate-6 border border-slate-400">
                        <div className="w-full h-full bg-slate-300 overflow-hidden">
                            <img
                                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400"
                                className="w-full h-full object-cover opacity-80 mix-blend-multiply"
                                alt="polaroid2"
                            />
                        </div>
                    </div>

                    <div className="absolute inset-0 bg-white p-2 pb-8 shadow-2xl rounded transform rotate-3 border border-slate-300">
                        <div className="w-full h-full bg-slate-800 overflow-hidden mb-1">
                            <img
                                src="https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400"
                                className="w-full h-full object-cover"
                                alt="polaroid3"
                            />
                        </div>
                        <div className="h-1.5 w-16 bg-slate-200 rounded-full mx-auto" />
                    </div>

                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-handwriting text-slate-400 whitespace-nowrap">
                        Vos Photos
                    </div>
                </div>
            </div>

            {/* Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />

            <div
                id="demo-area"
                className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl overflow-hidden aspect-[4/3] flex flex-col z-10"
            >
                <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/20" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                        <div className="w-3 h-3 rounded-full bg-green-500/20" />
                    </div>
                </div>

                <div
                    className="flex-1 relative flex items-center justify-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => demoState === "idle" && startDemo()}
                >
                    {demoState === "idle" && (
                        <div className="text-center space-y-4 cursor-pointer group/drop">
                            <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover/drop:scale-110 group-hover/drop:border-indigo-500/50 transition-all duration-300 relative">
                                <Upload size={32} className="text-slate-400 group-hover/drop:text-indigo-400" />
                                <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-ping opacity-0 group-hover/drop:opacity-100" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-white">Créer mon Album Vidéo</h3>
                                <p className="text-sm text-slate-500">Cliquez ou glissez vos photos ici</p>
                            </div>
                        </div>
                    )}

                    {demoState === "analyzing" && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
                            <div className="relative w-64 h-48 bg-slate-800 rounded-lg overflow-hidden border border-white/10">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/50 to-transparent w-full h-2 animate-[scan_1.5s_infinite_linear]" />
                                <div className="p-4 text-xs font-mono text-indigo-400 space-y-1 opacity-70">
                                    <p>&gt; Identifying depth map...</p>
                                    <p>&gt; Segmentation objects...</p>
                                    <p>&gt; Calculating parallax...</p>
                                </div>
                            </div>
                            <p className="mt-4 text-sm font-mono text-indigo-300 animate-pulse">Analyse de la scène...</p>
                        </div>
                    )}

                    {demoState === "generating" && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4" />
                            <p className="text-sm font-mono text-cyan-300">Rendu Neural 3D en cours...</p>
                            <div className="w-48 h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-cyan-500 animate-[progress_3s_ease-in-out]" />
                            </div>
                        </div>
                    )}

                    {demoState === "success" && (
                        <div className="absolute inset-0 bg-black">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center overflow-hidden">
                                <div className="w-[120%] h-[120%] bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center animate-[zoom_10s_infinite_alternate]" />
                                <div className="absolute inset-0 bg-black/20" />
                                <Play
                                    size={48}
                                    className="text-white/80 drop-shadow-lg absolute opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                />
                                <div className="absolute top-4 left-4 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-xs font-mono text-white/80">REC • 00:04:12</span>
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                                <div>
                                    <div className="text-xs font-bold text-white mb-1">Votre Souvenir est prêt</div>
                                    <div className="text-[10px] text-slate-300 font-mono">1080p • 60fps • Cinematic</div>
                                </div>
                                <button
                                    onClick={onDownloadClick}
                                    className="bg-white text-black text-xs font-bold px-4 py-2 rounded hover:bg-indigo-50 transition-colors shadow-lg shadow-white/20 animate-bounce-subtle"
                                >
                                    Télécharger
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute -right-8 top-20 bg-slate-800/90 backdrop-blur border border-white/10 p-3 rounded-lg shadow-xl animate-[float_4s_infinite_ease-in-out] z-10">
                <Layers size={20} className="text-indigo-400 mb-2" />
                <div className="w-12 h-1 bg-slate-600 rounded mb-1" />
                <div className="w-8 h-1 bg-slate-600 rounded" />
            </div>

            <div className="absolute -left-4 bottom-20 bg-slate-800/90 backdrop-blur border border-white/10 p-3 rounded-lg shadow-xl animate-[float_5s_infinite_ease-in-out_1s] z-10">
                <Wand2 size={20} className="text-cyan-400 mb-2" />
                <div className="w-10 h-1 bg-slate-600 rounded" />
            </div>
        </div>
    );
}
