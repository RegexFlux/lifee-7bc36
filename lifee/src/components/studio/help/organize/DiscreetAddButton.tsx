"use client";

import React, {useRef} from "react";
import {Plus} from "lucide-react";
import {cx} from "@/components/studio/help/ui";
import {useT} from "@/lib/i18n/useT";

export function DiscreetAddButton(props: { onFiles: (files: File[]) => void }) {
    const {t} = useT();
    const ref = useRef<HTMLInputElement | null>(null);

    return (
        <>
            <input
                ref={ref}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) props.onFiles(files);
                    e.target.value = "";
                }}
            />
            <button
                type="button"
                onClick={() => ref.current?.click()}
                className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 hover:bg-white",
                    "px-3 py-2 text-[12px] font-black text-stone-900 transition active:scale-[0.99]"
                )}
                data-tour="add-more"
            >
                <Plus size={16} className="text-stone-800"/>
                {t("studio.organize.add_more")}
            </button>
        </>
    );
}
