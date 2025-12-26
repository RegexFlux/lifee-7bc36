// File: src/components/i18n/LocaleSwitch.tsx
"use client";

import React from "react";
import {useRouter} from "next/router";
import {LOCALES, type Locale} from "@/lib/i18n/messages";

export function LocaleSwitch() {
    const router = useRouter();
    const current = (router.locale === "en" ? "en" : "fr") as Locale;

    const setLocale = async (l: Locale) => {
        await router.push(router.asPath, router.asPath, {locale: l});
    };

    return (
        <div className="inline-flex overflow-hidden rounded-xl border border-stone-200 bg-white">
            {LOCALES.map((l) => (
                <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={[
                        "px-3 py-2 text-xs font-extrabold transition-colors",
                        current === l ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-50",
                    ].join(" ")}
                >
                    {l.toUpperCase()}
                </button>
            ))}
        </div>
    );
}
