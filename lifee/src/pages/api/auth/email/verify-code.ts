// File: pages/api/auth/email/verify-code.ts
import type {NextApiRequest, NextApiResponse} from "next";
import crypto from "crypto";
import {and, desc, eq, gt, isNull, sql} from "drizzle-orm";
import {z} from "zod";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {zAuthEmailCodePurpose} from "@/lib/validation/enums";
import {AuthEmailCodePurpose} from "@/lib/shared/types";
import {authEmailCodes} from "@/lib/db/schema";

const Body = z.object({
    email: z.string().email(),
    purpose: zAuthEmailCodePurpose,
    code: z.string().regex(/^\d{6}$/),
});

function hashCode(code: string) {
    const secret = process.env.EMAIL_CODE_SECRET || process.env.AUTH_SECRET || "dev-secret";
    return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

const MAX_ATTEMPTS = 6;

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const parsed = Body.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const email = parsed.data.email.toLowerCase();
        const purpose: AuthEmailCodePurpose = parsed.data.purpose;
        const codeHash = hashCode(parsed.data.code);

        const now = new Date();

        // récupère le dernier code non consommé pour (email,purpose)
        const row = (
            await db
                .select()
                .from(authEmailCodes)
                .where(and(eq(authEmailCodes.email, email), eq(authEmailCodes.purpose, purpose), isNull(authEmailCodes.consumedAt)))
                .orderBy(desc(authEmailCodes.createdAt))
                .limit(1)
        )[0];

        if (!row) return fail(res, 400, "Invalid code");

        if (row.expiresAt <= now) return fail(res, 400, "Code expired");
        if (row.attempts >= MAX_ATTEMPTS) return fail(res, 429, "Too many attempts");

        // compare
        if (row.codeHash !== codeHash) {
            await db
                .update(authEmailCodes)
                .set({
                    attempts: sql`${authEmailCodes.attempts}
                    + 1`
                })
                .where(eq(authEmailCodes.id, row.id));

            return fail(res, 400, "Invalid code");
        }

        // success => consumedAt
        await db
            .update(authEmailCodes)
            .set({consumedAt: new Date()})
            .where(eq(authEmailCodes.id, row.id));

        return ok(res, {status: "ok"}, 200);
    },
});
