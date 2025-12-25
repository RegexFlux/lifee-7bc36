"use client";

import React, {useEffect, useState} from "react";
import {ArrowRight, X} from "lucide-react";
import {AlbumSimple} from "./AlbumSimple";

async function ensureGuestSession() {
    await fetch("/api/auth/guest", {method: "POST", credentials: "include"});
}

export function AlbumSimpleLauncher() {
    const [open, setOpen] = useState(false);
    const [booting, setBooting] = useState(false);

    const onOpen = async () => {
        setBooting(true);
        try {
            await ensureGuestSession();
            setOpen(true);
        } finally {
            setBooting(false);
        }
    };

    return (
        <>
            <button
                onClick={onOpen}
                disabled={booting}
                className={[
                    "group relative overflow-hidden",
                    "px-7 sm:px-8 py-4",
                    "rounded-2xl",
                    "bg-stone-900 hover:bg-stone-800",
                    "text-white text-base sm:text-lg font-bold",
                    "shadow-xl shadow-rose-200/70",
                    "transition-all",
                    "flex items-center justify-center gap-2",
                    "hover:-translate-y-0.5 active:translate-y-0",
                ].join(" ")}
            >
                {/* inner glow */}
                <span
                    className="absolute -inset-6 bg-gradient-to-r from-rose-500/35 to-amber-500/35 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"/>
                <span className="relative">Commencer mon album</span>
                <ArrowRight size={20}
                            className="relative transition-transform group-hover:translate-x-0.5"/>
            </button>

            {open ? (
                <div className="fixed inset-0 z-[100]">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setOpen(false)}
                    />
                    <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
                        <div
                            className="relative w-full sm:max-w-5xl max-h-[92vh] sm:max-h-[90vh] overflow-auto rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl">
                            <button
                                onClick={() => setOpen(false)}
                                className="absolute right-3 top-3 p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50"
                                aria-label="Fermer"
                            >
                                <X size={18} className="text-slate-600"/>
                            </button>

                            <div className="p-4 sm:p-6">
                                <AlbumSimple/>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
