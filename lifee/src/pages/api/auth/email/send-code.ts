// File: pages/api/auth/email/send-code.ts
import type {NextApiRequest, NextApiResponse} from "next";
import crypto from "crypto";
import {and, desc, eq, gt} from "drizzle-orm";
import {z} from "zod";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {sendEmail} from "@/lib/email/send";
import {authCodeEmail} from "@/lib/email/templates/authCode";
import {AuthEmailCodePurpose} from "@/lib/shared/types";
import {authEmailCodes} from "@/lib/db/schema";
import {zAuthEmailCodePurpose} from "@/lib/validation/enums";

const Body = z.object({
    email: z.email(),
    purpose: zAuthEmailCodePurpose.default("login"),
});

function make6DigitCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Hash stable côté serveur.
 * (Si tu as déjà un secret dédié, remplace EMAIL_CODE_SECRET)
 */
function hashCode(code: string) {
    const secret = process.env.EMAIL_CODE_SECRET || process.env.AUTH_SECRET || "dev-secret";
    return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const parsed = Body.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const email = parsed.data.email.toLowerCase();
        const purpose: AuthEmailCodePurpose = parsed.data.purpose;

        // rate limit: max 3 codes / 10 min / (email, purpose)
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recent = await db
            .select({id: authEmailCodes.id})
            .from(authEmailCodes)
            .where(and(eq(authEmailCodes.email, email), eq(authEmailCodes.purpose, purpose), gt(authEmailCodes.createdAt, tenMinAgo)))
            .orderBy(desc(authEmailCodes.createdAt))
            .limit(3);

        if (recent.length >= 3) return fail(res, 429, "Too many requests");

        const code = make6DigitCode();
        console.log(code);
        const minutes = 10;
        const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

        await db.insert(authEmailCodes).values({
            email,
            purpose,
            codeHash: hashCode(code),
            expiresAt,
            // attempts default 0
        });

        // Template: il faut aligner le template sur vos purposes
        const tpl = authCodeEmail({code, minutes, purpose});

        // TODO RESTORE
        // await sendEmail({
        //     to: email,
        //     subject: tpl.subject,
        //     html: tpl.html,
        //     text: tpl.text,
        // });

        return ok(res, {status: "sent"}, 201);
    },
});
