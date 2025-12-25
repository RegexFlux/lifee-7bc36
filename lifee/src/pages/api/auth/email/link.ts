// pages/api/auth/email/link.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {eq} from "drizzle-orm";

import {db} from "@/lib/db";
import {accountLinks, authEmailCodes, userEmailUpdates, users} from "@/lib/db/schema";
import {getOrCreateViewer} from "@/lib/auth/viewer";
import {sha256Base64Url, randomToken} from "@/lib/auth/crypto";
import {AUTH_CODE_TTL_MIN} from "@/lib/auth/constants";

const zBody = z.object({
    email: z.string().trim().toLowerCase().email(),
});

function codeHash(code: string) {
    const secret = process.env.AUTH_CODE_SECRET;
    if (!secret) throw new Error("Missing AUTH_CODE_SECRET");
    return sha256Base64Url(`${code}.${secret}`);
}

// TODO: branche ton provider email ici
async function sendMergeCodeEmail(email: string, code: string) {
    if (process.env.APP_ENV !== "production") {
        // en dev: log pour test
        console.log("[Lifee] merge code for", email, "=>", code);
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});

    const viewer = await getOrCreateViewer(req, res);

    const parsed = zBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({error: "Invalid body", details: parsed.error.flatten()});

    const newEmail = parsed.data.email;
    if (newEmail.endsWith("@lifee.invalid")) {
        return res.status(400).json({error: "Invalid email"});
    }

    // no-op
    if (newEmail === viewer.user.email) {
        return res.status(200).json({status: "ok", mode: "noop"});
    }

    const existing = await db.select().from(users).where(eq(users.email, newEmail)).limit(1);
    const existingUser = existing[0];

    // Email libre => update direct (sans confirmation)
    if (!existingUser) {
        await db.transaction(async (tx) => {
            await tx.insert(userEmailUpdates).values({
                userId: viewer.user.id,
                oldEmail: viewer.user.email,
                newEmail,
            });

            await tx.update(users).set({email: newEmail, type: "normal"}).where(eq(users.id, viewer.user.id));
        });

        return res.status(200).json({status: "ok", mode: "updated", email: newEmail});
    }

    // Email déjà utilisé par toi => no-op
    if (existingUser.id === viewer.user.id) {
        return res.status(200).json({status: "ok", mode: "noop"});
    }

    // Email déjà pris => créer account_link + envoyer code merge
    const accountLinkId = crypto.randomUUID();
    await db.insert(accountLinks).values({
        id: accountLinkId,
        guestUserId: viewer.user.id,
        targetUserId: existingUser.id,
        status: "pending",
    });

    const code = (Math.floor(100000 + Math.random() * 900000)).toString(); // 6 digits
    const expiresAt = new Date(Date.now() + 1000 * 60 * AUTH_CODE_TTL_MIN);

    await db.insert(authEmailCodes).values({
        email: newEmail,
        purpose: "merge_into_existing",
        codeHash: codeHash(code),
        expiresAt,
    });

    await sendMergeCodeEmail(newEmail, code);

    return res.status(200).json({
        status: "needs_merge",
        accountLinkId,
    });
}
