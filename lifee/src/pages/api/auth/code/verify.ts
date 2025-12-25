// pages/api/auth/code/verify.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, eq, gt, isNull, desc} from "drizzle-orm";

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

function codeHash(code: string) {
    const secret = process.env.AUTH_CODE_SECRET;
    if (!secret) throw new Error("Missing AUTH_CODE_SECRET");
    return sha256Base64Url(`${code}.${secret}`);
}

function sessionHash(token: string) {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Missing AUTH_SESSION_SECRET");
    return sha256Base64Url(`${token}.${secret}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});

    const parsed = zBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({error: "Invalid body", details: parsed.error.flatten()});

    const {email, purpose, code} = parsed.data;
    const now = new Date();

    // Find latest non-consumed code for (email,purpose)
    const rows = await db
        .select()
        .from(authEmailCodes)
        .where(and(eq(authEmailCodes.email, email), eq(authEmailCodes.purpose, purpose), isNull(authEmailCodes.consumedAt), gt(authEmailCodes.expiresAt, now)))
        .orderBy(desc(authEmailCodes.createdAt))
        .limit(1);

    const record = rows[0];
    if (!record) return res.status(400).json({error: "Invalid code"});

    // attempts guard
    if (record.attempts >= 8) return res.status(429).json({error: "Too many attempts"});

    const ok = record.codeHash === codeHash(code);
    if (!ok) {
        await db.update(authEmailCodes).set({attempts: record.attempts + 1}).where(eq(authEmailCodes.id, record.id));
        return res.status(400).json({error: "Invalid code"});
    }

    // consume code
    await db.update(authEmailCodes).set({consumedAt: now}).where(eq(authEmailCodes.id, record.id));

    // ensure user exists for email
    let user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];

    if (!user) {
        // create user on login purposes (safe)
        const userId = crypto.randomUUID();
        const [created] = await db
            .insert(users)
            .values({id: userId, email, type: "normal", credits: 0})
            .returning();
        user = created;
    }

    // create new auth session
    const token = randomToken(32);
    const hash = sessionHash(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    await db.insert(authSessions).values({
        userId: user.id,
        tokenHash: hash,
        expiresAt,
    });

    setSessionCookie(res, token);

    // For merge: we just logged user in as "target". Confirmation is separate.
    return res.status(200).json({
        status: "ok",
        user: {id: user.id, email: user.email, type: user.type, credits: user.credits},
        next:
            purpose === "merge_into_existing"
                ? {action: "merge_confirm_required" as const}
                : {action: "none" as const},
    });
}
