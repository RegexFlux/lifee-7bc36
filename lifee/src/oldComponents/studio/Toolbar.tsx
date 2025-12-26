"use client";

import React from "react";
import {
    Download,
    Music,
    PanelLeftOpen,
    ShipWheel,
    Info,
    Sparkles,
    ZoomIn,
    ZoomOut,
} from "lucide-react";

export function Toolbar(props: {
    isSidebarOpen: boolean;
    onOpenSidebar: () => void;

    credits: number;
    onOpenCredits: () => void;

    hasAudio: boolean;
    onOpenMusic: () => void;

    onExport: () => void;
    exportDisabled: boolean;

    showZoomControls?: boolean;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetView?: () => void;
    onHelp?: () => void;
}) {
    return (
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-start pointer-events-none">
            <div className="flex gap-2 pointer-events-auto">
                {!props.isSidebarOpen && (
                    <button
                        onClick={props.onOpenSidebar}
                        className="p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-600 active:bg-gray-100"
                        aria-label="Ouvrir la sidebar"
                    >
                        <PanelLeftOpen size={20} />
                    </button>
                )}

                {props.showZoomControls && (
                    <div className="flex gap-1 bg-white p-1 rounded-lg shadow-md border border-gray-200" data-tour="canvasTools">
                        <button
                            onClick={props.onZoomIn}
                            className="p-1.5 hover:bg-gray-100 rounded"
                            aria-label="Zoom in"
                        >
                            <ZoomIn size={18} />
                        </button>
                        <button
                            onClick={props.onZoomOut}
                            className="p-1.5 hover:bg-gray-100 rounded"
                            aria-label="Zoom out"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <button
                            onClick={props.onResetView}
                            className="p-1.5 hover:bg-gray-100 rounded"
                            aria-label="Reset view"
                        >
                            <ShipWheel size={18} />
                        </button>
                        <button
                            onClick={props.onHelp}
                            className="p-1.5 hover:bg-gray-100 rounded"
                            aria-label="Reset view"
                        >
                            <Info size={18} />
                        </button>
                    </div>
                )}

            </div>

            <div className="flex flex-col gap-2 items-end pointer-events-auto">
                <button
                    onClick={props.onOpenCredits}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur border border-amber-200 text-amber-600 rounded-full shadow-sm text-xs font-bold"
                >
                    <Sparkles size={14} className="fill-amber-400 text-amber-500" />{" "}
                    {props.credits}
                </button>

                <div className="flex gap-2">
                    <button
                        data-tour="music"
                        onClick={props.onOpenMusic}
                        className={`p-2 rounded-lg shadow-md border transition-colors ${
                            props.hasAudio
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                                : "bg-white border-gray-200 text-gray-600"
                        }`}
                        aria-label="Musique"
                    >
                        <Music size={20} className={props.hasAudio ? "animate-pulse" : ""} />
                    </button>

                    <button
                        data-tour="export"
                        onClick={props.onExport}
                        disabled={props.exportDisabled}
                        className="p-2 bg-slate-900 text-white rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50"
                        aria-label="Exporter"
                    >
                        <Download size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
