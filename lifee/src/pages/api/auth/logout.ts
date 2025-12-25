// pages/api/auth/logout.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, gt, isNull} from "drizzle-orm";

import {db} from "@/lib/db";
import {authSessions} from "@/lib/db/schema";
import {clearSessionCookie, getCookie} from "@/lib/auth/cookies";
import {LIFEe_SESSION_COOKIE} from "@/lib/auth/constants";
import {sha256Base64Url} from "@/lib/auth/crypto";

function sessionHash(token: string) {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Missing AUTH_SESSION_SECRET");
    return sha256Base64Url(`${token}.${secret}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});

    const token = getCookie(req, LIFEe_SESSION_COOKIE);
    if (token) {
        const hash = sessionHash(token);
        const now = new Date();
        await db
            .update(authSessions)
            .set({revokedAt: now})
            .where(and(eq(authSessions.tokenHash, hash), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, now)));
    }

    clearSessionCookie(res);
    return res.status(200).json({status: "ok"});
}
