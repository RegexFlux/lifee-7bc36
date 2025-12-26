import fr from "@/locales/fr.json";
import en from "@/locales/en.json";

export type Locale = "fr" | "en";

const dictionaries = {
    fr,
    en,
} as const;

type Dict = typeof dictionaries.en;
type Params = Record<string, string | number | boolean | null | undefined>;

function interpolate(template: string, params?: Params) {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
        const v = params[key];
        return v === null || v === undefined ? "" : String(v);
    });
}

export function createT(locale: Locale) {
    const dict = dictionaries[locale] as Dict;

    return function t<K extends keyof Dict>(
        key: K,
        params?: Params
    ): string {
        const raw = dict[key] ?? (key as string);
        return interpolate(String(raw), params);
    };
}
