// pages/api/auth/session.ts
import type {NextApiRequest, NextApiResponse} from "next";
import crypto from "crypto";
import {eq, and, isNull, gt} from "drizzle-orm";

import {db} from "@/lib/db";
import {appUsers, authSessions} from "@/lib/db/schema.auth";

export const COOKIE_NAME = "lifee_session";
const SESSION_DAYS = 30;

function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken() {
    return crypto.randomBytes(32).toString("hex");
}

function serializeCookie(name: string, value: string, opts: {
    maxAgeSeconds: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
}): string {
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        `Max-Age=${opts.maxAgeSeconds}`,
        `Path=${opts.path ?? "/"}`,
        `SameSite=${opts.sameSite ?? "lax"}`,
    ];
    if (opts.httpOnly !== false) parts.push("HttpOnly");
    if (opts.secure) parts.push("Secure");
    return parts.join("; ");
}

export async function createSession(res: NextApiResponse, userId: string) {
    const token = randomToken();
    const tokenHash = sha256(token);

    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);

    await db.insert(authSessions).values({
        userId,
        tokenHash,
        expiresAt,
    });

    const isProd = process.env.NODE_ENV === "production";
    res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, token, {
        maxAgeSeconds: SESSION_DAYS * 24 * 3600,
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
    }));
}

export function clearSessionCookie(res: NextApiResponse) {
    const isProd = process.env.NODE_ENV === "production";
    res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, "", {
        maxAgeSeconds: 0,
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
    }));
}

export async function getUserFromReq(req: NextApiRequest) {
    const raw = req.headers.cookie || "";
    const m = raw.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
    if (!m) return null;

    const token = decodeURIComponent(m[1] || "");
    if (!token) return null;

    const tokenHash = sha256(token);
    const now = new Date();

    const rows = await db
        .select({userId: authSessions.userId, email: appUsers.email})
        .from(authSessions)
        .leftJoin(appUsers, eq(authSessions.userId, appUsers.id))
        .where(
            and(
                eq(authSessions.tokenHash, tokenHash),
                isNull(authSessions.revokedAt),
                gt(authSessions.expiresAt, now)
            )
        )
        .limit(1);

    return rows[0];
}

export async function getUserIdFromReq(req: NextApiRequest): Promise<string | null> {
    const raw = req.headers.cookie || "";
    const m = raw.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
    if (!m) return null;

    const token = decodeURIComponent(m[1] || "");
    if (!token) return null;

    const tokenHash = sha256(token);
    const now = new Date();

    const rows = await db
        .select({userId: authSessions.userId})
        .from(authSessions)
        .where(
            and(
                eq(authSessions.tokenHash, tokenHash),
                isNull(authSessions.revokedAt),
                gt(authSessions.expiresAt, now)
            )
        )
        .limit(1);

    return rows[0]?.userId ?? null;
}
