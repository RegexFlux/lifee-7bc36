import type {GetServerSidePropsContext} from "next";
import type {Locale} from "./index";

function parseCookie(header: string | undefined) {
    const out: Record<string, string> = {};
    if (!header) return out;
    header.split(";").forEach((part) => {
        const [k, ...rest] = part.trim().split("=");
        out[k] = decodeURIComponent(rest.join("=") || "");
    });
    return out;
}

function pickFromAcceptLanguage(h: string | undefined): Locale | null {
    if (!h) return null;
    // ex: "fr-FR,fr;q=0.9,en;q=0.8"
    const first = h.split(",")[0]?.trim().toLowerCase();
    if (!first) return null;
    if (first.startsWith("fr")) return "fr";
    if (first.startsWith("en")) return "en";
    return null;
}

export function getLocaleFromRequest(ctx: GetServerSidePropsContext): Locale {
    const cookies = parseCookie(ctx.req.headers.cookie);
    const cookieLocale = cookies["locale"];
    if (cookieLocale === "fr" || cookieLocale === "en") return cookieLocale;

    return pickFromAcceptLanguage(ctx.req.headers["accept-language"]) ?? "fr";
}
