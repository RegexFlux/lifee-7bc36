import {useContext} from "react";
import {I18nContext} from "@/components/i18n/I18nProvider";

export function useT() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error("useT must be used within I18nProvider");
    return ctx;
}
