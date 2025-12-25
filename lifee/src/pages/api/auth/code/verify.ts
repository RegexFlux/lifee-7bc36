// pages/api/auth/code/verify.ts
import crypto from "crypto";
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, desc, eq, gt, isNull} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {authEmailCodes, authSessions, users} from "@/lib/db/schema";
import {zAuthEmailCodePurpose} from "@/lib/validation/enums";
import {randomToken, sha256Base64Url} from "@/lib/auth/crypto";
import {setSessionCookie} from "@/lib/auth/cookies";

const zBody = z.object({
    email: z.string().trim().toLowerCase().email(),
    purpose: zAuthEmailCodePurpose,
    code: z.string().trim().min(4).max(10),
});

function mustGetCodeSecret() {
    const secret = process.env.AUTH_CODE_SECRET;
    if (!secret) throw new Error("Missing AUTH_CODE_SECRET");
    return secret;
}

function mustGetSessionSecret() {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Missing AUTH_SESSION_SECRET");
    return secret;
}

function codeHash(code: string) {
    return sha256Base64Url(`${code}.${mustGetCodeSecret()}`);
}

function sessionHash(token: string) {
    return sha256Base64Url(`${token}.${mustGetSessionSecret()}`);
}

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const {email, purpose, code} = parsed.data;
        const now = new Date();

        const record = (
            await db
                .select()
                .from(authEmailCodes)
                .where(
                    and(
                        eq(authEmailCodes.email, email),
                        eq(authEmailCodes.purpose, purpose),
                        isNull(authEmailCodes.consumedAt),
                        gt(authEmailCodes.expiresAt, now)
                    )
                )
                .orderBy(desc(authEmailCodes.createdAt))
                .limit(1)
        )[0];

        if (!record) return fail(res, 400, "Invalid code");
        if (record.attempts >= 8) return fail(res, 429, "Too many attempts");

        const isOk = record.codeHash === codeHash(code);
        if (!isOk) {
            await db.update(authEmailCodes).set({attempts: record.attempts + 1}).where(eq(authEmailCodes.id, record.id));
            return fail(res, 400, "Invalid code");
        }

        await db.update(authEmailCodes).set({consumedAt: now}).where(eq(authEmailCodes.id, record.id));

        let user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];

        if (!user) {
            if (purpose === "merge_into_existing") {
                // pour merge: l’email doit déjà exister
                return fail(res, 400, "Invalid merge code");
            }
            // login: créer user normal
            const userId = crypto.randomUUID();
            [user] = await db
                .insert(users)
                .values({id: userId, email, type: "normal", credits: 0})
                .returning();
        }

        const token = randomToken(32);
        const hash = sessionHash(token);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

        await db.insert(authSessions).values({userId: user.id, tokenHash: hash, expiresAt});
        setSessionCookie(res, token);

        return ok(res, {
            status: "ok",
            user: {id: user.id, email: user.email, type: user.type, credits: user.credits},
            next: purpose === "merge_into_existing" ? {action: "merge_confirm_required"} : {action: "none"},
        });
    },
});
