// pages/api/auth/code/request.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, desc, eq, gt} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {authEmailCodes} from "@/lib/db/schema";
import {zAuthEmailCodePurpose} from "@/lib/validation/enums";
import {AUTH_CODE_TTL_MIN} from "@/lib/auth/constants";
import {sha256Base64Url} from "@/lib/auth/crypto";

const zBody = z.object({
    email: z.string().trim().toLowerCase().email(),
    purpose: zAuthEmailCodePurpose,
});

function mustGetCodeSecret() {
    const secret = process.env.AUTH_CODE_SECRET;
    if (!secret) throw new Error("Missing AUTH_CODE_SECRET");
    return secret;
}

function codeHash(code: string) {
    const secret = mustGetCodeSecret();
    return sha256Base64Url(`${code}.${secret}`);
}

// TODO provider email
async function sendCodeEmail(email: string, purpose: string, code: string) {
    if (process.env.APP_ENV !== "production") {
        console.log("[Lifee] code", purpose, "for", email, "=>", code);
    }
}

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const {email, purpose} = parsed.data;

        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recent = await db
            .select({id: authEmailCodes.id})
            .from(authEmailCodes)
            .where(and(eq(authEmailCodes.email, email), eq(authEmailCodes.purpose, purpose), gt(authEmailCodes.createdAt, tenMinAgo)))
            .orderBy(desc(authEmailCodes.createdAt));

        if (recent.length >= 3) return fail(res, 429, "Too many requests. Try later.");

        const code = (Math.floor(100000 + Math.random() * 900000)).toString();
        const expiresAt = new Date(Date.now() + 1000 * 60 * AUTH_CODE_TTL_MIN);

        await db.insert(authEmailCodes).values({
            email,
            purpose,
            codeHash: codeHash(code),
            expiresAt,
        });

        await sendCodeEmail(email, purpose, code);
        return ok(res, {status: "ok"});
    },
});
