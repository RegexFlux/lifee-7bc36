// src/lib/auth/cookies.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {serialize, parse} from "cookie";
import {LIFEe_SESSION_COOKIE, LIFEe_DEMO_COOKIE, SESSION_TTL_DAYS} from "./constants";

function cookieBaseOptions() {
    const isProd = process.env.APP_ENV === "production";
    const domain = process.env.COOKIE_DOMAIN || undefined;
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax" as const,
        path: "/",
        domain,
    };
}

export function getCookie(req: NextApiRequest, name: string) {
    const cookies = parse(req.headers.cookie || "");
    return cookies[name] || null;
}

export function setSessionCookie(res: NextApiResponse, token: string) {
    const maxAge = 60 * 60 * 24 * SESSION_TTL_DAYS;
    res.setHeader(
        "Set-Cookie",
        serialize(LIFEe_SESSION_COOKIE, token, {...cookieBaseOptions(), maxAge})
    );
}

export function clearSessionCookie(res: NextApiResponse) {
    res.setHeader(
        "Set-Cookie",
        serialize(LIFEe_SESSION_COOKIE, "", {...cookieBaseOptions(), maxAge: 0})
    );
}

export function setDemoCookie(res: NextApiResponse, signedValue: string) {
    const maxAge = 60 * 60 * 24 * 365; // 1 an
    res.setHeader(
        "Set-Cookie",
        serialize(LIFEe_DEMO_COOKIE, signedValue, {...cookieBaseOptions(), maxAge})
    );
}

export function getDemoCookie(req: NextApiRequest) {
    return getCookie(req, LIFEe_DEMO_COOKIE);
}
