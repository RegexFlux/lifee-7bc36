import React from "react";

export default function TransitionScreen() {
    return (
        <div className="h-screen bg-black flex items-center justify-center text-white">
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-xl font-light tracking-widest">OUVERTURE DU STUDIO...</div>
            </div>
        </div>
    );
}
