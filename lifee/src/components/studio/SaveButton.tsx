// File: src/components/studio/SaveButton.tsx
"use client";

import React from "react";
import {Bookmark} from "lucide-react";
import {useGuestGate} from "@/lib/auth/useGuestGate";

export function SaveButton({onSave}: { onSave: () => Promise<void> }) {
    const {guard, isGuest, openAuth} = useGuestGate();

    return (
        <button
            onClick={() => guard(onSave, "link_guest")}
            className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800"
            title={isGuest ? "Associez un email pour sauvegarder" : "Sauvegarder"}
        >
            <Bookmark size={16}/>
            Sauvegarder
        </button>
    );
}
