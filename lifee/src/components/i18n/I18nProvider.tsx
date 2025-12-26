import React, {createContext, useMemo} from "react";
import {createT, type Locale} from "@/lib/i18n";

type Ctx = {
    locale: Locale;
    t: ReturnType<typeof createT>;
};

export const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
                                 locale,
                                 children,
                             }: {
    locale: Locale;
    children: React.ReactNode;
}) {
    const value = useMemo(() => {
        return {locale, t: createT(locale)};
    }, [locale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
