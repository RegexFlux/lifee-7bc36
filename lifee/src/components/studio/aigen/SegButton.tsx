// components/lifee/aigen/ui/SegButton.tsx
"use client";

import * as React from "react";

export function SegButton(props: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={props.onClick}
            className={[
                "flex-1 rounded-full px-3 py-2 text-xs font-semibold transition",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200",
                props.active
                    ? "bg-stone-900 text-white shadow"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50",
            ].join(" ")}
        >
            {props.label}
        </button>
    );
}
