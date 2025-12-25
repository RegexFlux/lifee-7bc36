// pages/api/auth/logout.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, gt, isNull} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok} from "@/lib/api/response";
import {db} from "@/lib/db";
import {authSessions} from "@/lib/db/schema";
import {clearSessionCookie, getCookie} from "@/lib/auth/cookies";
import {LIFEe_SESSION_COOKIE} from "@/lib/auth/constants";
import {sha256Base64Url} from "@/lib/auth/crypto";

function mustGetSessionSecret() {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Missing AUTH_SESSION_SECRET");
    return secret;
}

function sessionHash(token: string) {
    return sha256Base64Url(`${token}.${mustGetSessionSecret()}`);
}

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
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
        return ok(res, {status: "ok"});
    },
});
