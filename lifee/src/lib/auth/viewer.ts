// src/lib/auth/viewer.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, gt, isNull} from "drizzle-orm";

import {db} from "@/lib/db";
import {authSessions, users} from "@/lib/db/schema";

import {
    DEMO_START_CREDITS,
    LIFEe_DEMO_COOKIE,
    LIFEe_SESSION_COOKIE,
    makeGuestEmail,
} from "./constants";
import {getCookie, getDemoCookie, setDemoCookie, setSessionCookie} from "./cookies";
import {randomToken, sha256Base64Url, signValue, verifySignedValue} from "./crypto";

type Viewer = {
    user: {
        id: string;
        email: string;
        type: "guest" | "normal";
        credits: number;
        createdAt: Date;
    };
    sessionId: string;
    isNewUser: boolean;
    isNewSession: boolean;
};

function sessionHash(token: string) {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Missing AUTH_SESSION_SECRET");
    return sha256Base64Url(`${token}.${secret}`);
}

function demoCookieSignedValue() {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Missing AUTH_SESSION_SECRET");
    const payload = JSON.stringify({v: 1, grantedAt: Date.now()});
    return signValue(Buffer.from(payload).toString("base64url"), secret);
}

function hasValidDemoCookie(req: NextApiRequest) {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Missing AUTH_SESSION_SECRET");
    const raw = getDemoCookie(req);
    if (!raw) return false;
    const {ok, value} = verifySignedValue(raw, secret);
    if (!ok) return false;
    // value = base64url(json)
    try {
        const json = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
        return !!json?.grantedAt;
    } catch {
        return false;
    }
}

export async function getOrCreateViewer(req: NextApiRequest, res: NextApiResponse): Promise<Viewer> {
    // 1) Try existing session
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
            .where(and(eq(authSessions.tokenHash, hash), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, now)))
            .limit(1);

        if (rows[0]) {
            return {
                user: {
                    id: rows[0].userId,
                    email: rows[0].email,
                    type: rows[0].type as any,
                    credits: rows[0].credits,
                    createdAt: rows[0].createdAt,
                },
                sessionId: rows[0].sessionId,
                isNewUser: false,
                isNewSession: false,
            };
        }
    }

    // 2) Create guest user + session (auto-guest)
    const isDemoAlreadyGranted = hasValidDemoCookie(req);
    const credits = isDemoAlreadyGranted ? 0 : DEMO_START_CREDITS;

    const userId = crypto.randomUUID();
    const guestEmail = makeGuestEmail(userId);

    const [u] = await db
        .insert(users)
        .values({
            id: userId,
            email: guestEmail,
            type: "guest",
            credits,
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
            expiresAt,
        })
        .returning();

    setSessionCookie(res, sessionToken);

    // grant demo cookie only once per browser
    if (!isDemoAlreadyGranted) {
        setDemoCookie(res, demoCookieSignedValue());
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
