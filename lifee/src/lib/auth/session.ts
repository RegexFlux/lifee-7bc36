// File: src/lib/auth/session.ts
import crypto from "node:crypto";
import type {NextApiRequest, NextApiResponse} from "next";
import {serialize} from "cookie";

import {db} from "@/lib/db";
import {authSessions} from "@/lib/db/schema";

const SESSION_DAYS = 30;

function required(name: string, v?: string) {
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

function base64url(buf: Buffer) {
    return buf
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function makeSessionToken() {
    return base64url(crypto.randomBytes(32));
}

function hashSessionToken(token: string) {
    const secret = required("SESSION_TOKEN_SECRET", process.env.SESSION_TOKEN_SECRET);
    return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

function getIp(req: NextApiRequest) {
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
    const ra = req.socket?.remoteAddress;
    return ra || "0.0.0.0";
}

function getUserAgent(req: NextApiRequest) {
    const ua = req.headers["user-agent"];
    return (typeof ua === "string" && ua.trim()) ? ua : "unknown";
}

export async function createAuthSession(params: { userId: string; req: NextApiRequest }) {
    const token = makeSessionToken();
    const tokenHash = hashSessionToken(token);

    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(authSessions).values({
        userId: params.userId,
        tokenHash,
        ip: getIp(params.req),
        userAgent: getUserAgent(params.req),
        expiresAt,
    });

    return {token, expiresAt};
}

export function setLifeeSessionCookie(res: NextApiResponse, token: string, expiresAt: Date) {
    const secure = process.env.NODE_ENV === "production";
    const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    res.setHeader(
        "Set-Cookie",
        serialize("lifee_session", token, {
            httpOnly: true,
            secure,
            sameSite: "lax",
            path: "/",
            maxAge,
        })
    );
}
