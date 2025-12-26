import React from "react";

export default function BackgroundEffects() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Blobs animés pour l'effet "Golden Hour" */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-200/40 rounded-full blur-3xl mix-blend-multiply filter animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl mix-blend-multiply filter animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-100/40 rounded-full blur-3xl mix-blend-multiply filter animate-blob animation-delay-4000"></div>
        </div>
    );
}
