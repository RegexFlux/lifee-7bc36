// components/lifee/PlayerCard.tsx
import React from "react";
import { Clock } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";

export function PlayerCard(props: {
    videoUrl: string | null;
    title: string;
    createdLabel: string;
    createdBy: string;
    progress: number; // 0..1
    statusText: string;
}) {
    const pct = Math.round(props.progress * 100);

    return (
        <div className="w-full lg:w-2/3 relative group animate-in slide-in-from-left-10 fade-in duration-700">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
            <div className="relative bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl aspect-video flex items-center justify-center group-player">
                <VideoPlayer videoUrl={props.videoUrl} />

                <div className=" hidden md:block absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">{props.title}</h2>
                            <p className="text-sm text-slate-300 flex items-center gap-2 font-mono">
                                <Clock size={14} className="text-indigo-400" />
                                {props.createdLabel} par <span className="text-white font-bold">{props.createdBy}</span>
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-1">{props.statusText}</p>
                        </div>
                        <div className="flex gap-2">
              <span className="px-2 py-1 bg-white/10 border border-white/5 rounded text-[10px] uppercase font-bold tracking-wider text-slate-300">
                1080p
              </span>
                            <span className="px-2 py-1 bg-white/10 border border-white/5 rounded text-[10px] uppercase font-bold tracking-wider text-slate-300">
                {pct}%
              </span>
                        </div>
                    </div>

                    <div className="w-full h-1 bg-white/20 rounded-full mt-4 overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
