// File: src/lib/i18n/useT.ts
"use client";

import {messages} from "@/lib/i18n/messages";

type Locale = keyof typeof messages;
export type MessageKey = keyof (typeof messages)["fr"];

import {useCallback, useEffect, useMemo, useState} from "react";

const DEFAULT_LOCALE: Locale = "fr";
const LS_KEY = "lifee:locale";
const COOKIE_KEY = "lifee_locale";

function readCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&")}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
}

function isLocale(v: any): v is Locale {
    return v === "fr" || v === "en";
}

export function useT() {
    // ✅ SSR et 1er render client = même valeur => pas de mismatch
    const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

    // ✅ appliquer la préférence seulement après hydration
    useEffect(() => {
        try {
            const fromCookie = readCookie(COOKIE_KEY);
            const fromLS = localStorage.getItem(LS_KEY);
            const next = (fromCookie || fromLS || DEFAULT_LOCALE);
            if (isLocale(next)) {
                setLocale(next);
            }
        } catch {
            // ignore
        }
    }, []);

    const dict = useMemo(() => messages[locale] ?? messages[DEFAULT_LOCALE], [locale]);

    const t = useCallback(
        (key: MessageKey):  => `${dict[key] ?? messages[DEFAULT_LOCALE][key] ?? (key as string)}`,
        [dict]
    );

    return {t, locale, setLocale};
}

