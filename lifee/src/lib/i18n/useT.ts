// File: src/lib/i18n/useT.ts
import {useMemo} from "react";
import {useRouter} from "next/router";
import {messages, type Locale, type MessageKey} from "@/lib/i18n/messages";

function normalizeLocale(l?: string): Locale {
    return l === "en" ? "en" : "fr";
}

export function useT() {
    const router = useRouter();
    const locale = normalizeLocale(router.locale);

    return useMemo(() => {
        const dict = messages[locale];

        function t<K extends MessageKey>(
            key: K,
            params?: Record<string, string | number>
        ): string {
            const entry = dict[key];
            if (!entry) return String(key);

            if (typeof entry === "function") return entry(params ?? {});
            return entry;
        }

        return {t, locale};
    }, [locale]);
}
