// src/components/i18n/LocaleSwitch.tsx
import React from "react";
import {useRouter} from "next/router";
import {Locale} from "@/lib/i18n/index";

export function LocaleSwitch() {
    const router = useRouter();
    const current = (router.locale === "fr" ? "fr" : "en") as Locale;

    const setLocale = async (l: Locale) => {
        await router.push(router.asPath, router.asPath, {locale: l, scroll: false});
    };

    return (
        <div className="inline-flex overflow-hidden rounded-xl border border-stone-200 bg-white">
            {(["fr", "en"] as Locale[]).map((l: Locale) => (
                <button
                    key={l}
                    type="button"
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
