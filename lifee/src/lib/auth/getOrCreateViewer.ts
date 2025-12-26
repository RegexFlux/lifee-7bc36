// File: src/lib/auth/getOrCreateViewer.ts
import type {NextApiRequest, NextApiResponse} from "next";
import crypto from "crypto";
import {and, eq, gt, isNull} from "drizzle-orm";

import {db} from "@/lib/db";
import {authSessions, users} from "@/lib/db/schema";
import {getCookie, getDemoCookie, setDemoCookie, setSessionCookie} from "@/lib/auth/cookies";
import {sha256Base64Url, signValue, verifySignedValue} from "@/lib/auth/crypto";
import {LIFEe_SESSION_COOKIE, makeGuestEmail} from "@/lib/auth/constants";

export const DEMO_START_CREDITS = 2;

export type Viewer = {
    user: { id: string; email: string; type: "guest" | "user"; credits: number; createdAt: Date };
    sessionId: string;
    isNewUser: boolean;
    isNewSession: boolean;
};

function mustGetSessionSecret() {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Missing AUTH_SESSION_SECRET");
    return secret;
}

function makeDemoCookieSignedValue() {
    const secret = mustGetSessionSecret();
    const payload = JSON.stringify({v: 1, grantedAt: Date.now()});
    return signValue(Buffer.from(payload).toString("base64url"), secret);
}

function hasValidDemoCookie(req: NextApiRequest) {
    const secret = mustGetSessionSecret();
    const raw = getDemoCookie(req);
    if (!raw) return false;

    const {ok, value} = verifySignedValue(raw, secret);
    if (!ok) return false;

    try {
        const json = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
        return !!json?.grantedAt;
    } catch {
        return false;
    }
}

function required(name: string, v?: string) {
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

function base64url(buf: Buffer) {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(bytes = 32) {
    return base64url(crypto.randomBytes(bytes));
}

function sessionHash(token: string) {
    const secret = required("SESSION_TOKEN_SECRET", process.env.SESSION_TOKEN_SECRET);
    return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

function getIp(req: NextApiRequest) {
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
    return req.socket?.remoteAddress || "0.0.0.0";
}

function getUserAgent(req: NextApiRequest) {
    const ua = req.headers["user-agent"];
    return (typeof ua === "string" && ua.trim()) ? ua : "unknown";
}

export async function getOrCreateViewer(req: NextApiRequest, res: NextApiResponse): Promise<Viewer> {
    // 1) existing session?
    const token = getCookie(req, LIFEe_SESSION_COOKIE);
    if (token) {
        const hash = sessionHash(token);
        const now = new Date();

        const rows = await db
            .select({
                sessionId: authSessions.id,
                userId: users.id,
                email: users.email,
                type: users.type,
                credits: users.credits,
                createdAt: users.createdAt,
            })
            .from(authSessions)
            .innerJoin(users, eq(authSessions.userId, users.id))
            .where(
                and(
                    eq(authSessions.tokenHash, hash),
                    isNull(authSessions.revokedAt),
                    gt(authSessions.expiresAt, now)
                )
            )
            .limit(1);

        const row = rows[0];
        if (row) {
            return {
                user: {
                    id: row.userId,
                    email: row.email,
                    type: row.type as any,
                    credits: row.credits,
                    createdAt: row.createdAt,
                },
                sessionId: row.sessionId,
                isNewUser: false,
                isNewSession: false,
            };
        }
    }

    // 2) auto-guest create
    const demoAlreadyGranted = hasValidDemoCookie(req);
    const startCredits = demoAlreadyGranted ? 0 : DEMO_START_CREDITS;

    const userId = crypto.randomUUID(); // ok si users.id est uuid
    const guestEmail = makeGuestEmail(userId);

    const [u] = await db
        .insert(users)
        .values({
            id: userId,
            email: guestEmail,
            type: "guest",
            credits: startCredits,
        })
        .returning();

    const sessionToken = randomToken(32);
    const hash = sessionHash(sessionToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    const [s] = await db
        .insert(authSessions)
        .values({
            userId: u.id,
            tokenHash: hash,
            ip: getIp(req),
            userAgent: getUserAgent(req),
            expiresAt,
            // revokedAt null
        })
        .returning();

    setSessionCookie(res, sessionToken, {expiresAt}); // ton helper doit set httpOnly + maxAge aligné

    if (!demoAlreadyGranted) {
        setDemoCookie(res, makeDemoCookieSignedValue());
    }

    return {
        user: {
            id: u.id,
            email: u.email,
            type: u.type as any,
            credits: u.credits,
            createdAt: u.createdAt,
        },
        sessionId: s.id,
        isNewUser: true,
        isNewSession: true,
    };
}
