// pages/api/auth/email/link.ts


import crypto from "crypto";
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {accountLinks, authEmailCodes, userEmailUpdates, users} from "@/lib/db/schema";
import {requireViewer} from "@/lib/auth/require";
import {AUTH_CODE_TTL_MIN} from "@/lib/auth/constants";
import {sha256Base64Url} from "@/lib/auth/crypto";

const zBody = z.object({
    email: z.string().trim().toLowerCase().email(),
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

// TODO: branche ton provider email
async function sendMergeCodeEmail(email: string, code: string) {
    if (process.env.APP_ENV !== "production") {
        console.log("[Lifee] merge code for", email, "=>", code);
    }
}

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const newEmail = parsed.data.email;

        if (newEmail.endsWith("@lifee.invalid")) return fail(res, 400, "Invalid email");
        if (newEmail === viewer.user.email) return ok(res, {status: "ok", mode: "noop"});

        const existing = (await db.select().from(users).where(eq(users.email, newEmail)).limit(1))[0];

        // Email libre => update direct (guest ou normal)
        if (!existing) {
            await db.transaction(async (tx) => {
                await tx.insert(userEmailUpdates).values({
                    userId: viewer.user.id,
                    oldEmail: viewer.user.email,
                    newEmail,
                });
                await tx.update(users).set({email: newEmail, type: "normal"}).where(eq(users.id, viewer.user.id));
            });
            return ok(res, {status: "ok", mode: "updated", email: newEmail});
        }

        // Si c'est déjà toi
        if (existing.id === viewer.user.id) return ok(res, {status: "ok", mode: "noop"});

        // Email déjà pris par un autre user
        if (viewer.user.type !== "guest") {
            return fail(res, 409, "Email already in use");
        }

        // guest -> propose merge flow
        const accountLinkId = crypto.randomUUID();
        await db.insert(accountLinks).values({
            id: accountLinkId,
            guestUserId: viewer.user.id,
            targetUserId: existing.id,
            status: "pending",
        });

        const code = (Math.floor(100000 + Math.random() * 900000)).toString();
        const expiresAt = new Date(Date.now() + 1000 * 60 * AUTH_CODE_TTL_MIN);

        await db.insert(authEmailCodes).values({
            email: newEmail,
            purpose: "merge_into_existing",
            codeHash: codeHash(code),
            expiresAt,
        });

        await sendMergeCodeEmail(newEmail, code);

        return ok(res, {status: "needs_merge", accountLinkId});
    },
});
