// File: pages/api/auth/email/verify-code.ts
import type {NextApiRequest, NextApiResponse} from "next";
import crypto from "crypto";
import {and, desc, eq, gt, isNull, sql} from "drizzle-orm";
import {z} from "zod";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {
    accountLinks,
    albums,
    assets, authEmailCodes,
    creditEvents,
    exportJobs,
    generationShares,
    replicateGenerationJobs,
    users
} from "@/lib/db/schema";
import {AUTH_EMAIL_CODE_PURPOSES} from "@/lib/shared/enums";
import {AuthEmailCodePurpose} from "@/lib/shared/types";
import {requireViewer} from "@/lib/auth/require";
import {createAuthSession, setLifeeSessionCookie} from "@/lib/auth/session";

const Body = z.object({
    email: z.string().email(),
    purpose: z.enum(AUTH_EMAIL_CODE_PURPOSES),
    code: z.string().regex(/^\d{6}$/),
});

function hashCode(code: string) {
    const secret = process.env.EMAIL_CODE_SECRET || process.env.AUTH_SECRET || "dev-secret";
    return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

function timingSafeEqualHex(a: string, b: string) {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

const MAX_ATTEMPTS = 6;

function isGuestEmail(email: string) {
    return email.endsWith("@lifee.invalid");
}

async function ensureEmailFree(email: string, exceptUserId?: string) {
    const existing = (
        await db
            .select({id: users.id})
            .from(users)
            .where(eq(users.email, email))
            .limit(1)
    )[0];

    if (!existing) return true;
    if (exceptUserId && existing.id === exceptUserId) return true;
    return false;
}

async function mergeGuestIntoExisting(params: { guestUserId: string; targetUserId: string }) {
    await db.transaction(async (tx) => {
        // Transfer ownership
        await tx.update(assets).set({userId: params.targetUserId}).where(eq(assets.userId, params.guestUserId));
        await tx.update(albums).set({userId: params.targetUserId}).where(eq(albums.userId, params.guestUserId));
        await tx.update(replicateGenerationJobs).set({userId: params.targetUserId}).where(eq(replicateGenerationJobs.userId, params.guestUserId));
        await tx.update(exportJobs).set({userId: params.targetUserId}).where(eq(exportJobs.userId, params.guestUserId));
        await tx.update(creditEvents).set({userId: params.targetUserId}).where(eq(creditEvents.userId, params.guestUserId));
        await tx.update(generationShares).set({userId: params.targetUserId}).where(eq(generationShares.userId, params.guestUserId));

        // Credits: add guest credits to target, then zero guest
        // (si tu veux une autre règle: on ajuste)
        const guest = (await tx.select({credits: users.credits}).from(users).where(eq(users.id, params.guestUserId)).limit(1))[0];
        if (guest?.credits && guest.credits > 0) {
            await tx.execute(sql`
                UPDATE "users"
                SET "credits" = "credits" + ${guest.credits}
                WHERE "id" = ${params.targetUserId}
            `);
            await tx.execute(sql`
                UPDATE "users"
                SET "credits" = 0
                WHERE "id" = ${params.guestUserId}
            `);
        }

        // account_links completed (best-effort)
        await tx.insert(accountLinks).values({
            guestUserId: params.guestUserId,
            targetUserId: params.targetUserId,
            status: "completed",
            createdAt: new Date(),
            completedAt: new Date(),
        }).onConflictDoNothing?.(); // si dispo selon ton driver (sinon enlève)
    });
}

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const parsed = Body.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const email = parsed.data.email.toLowerCase();
        const purpose: AuthEmailCodePurpose = parsed.data.purpose;
        const codeHash = hashCode(parsed.data.code);

        // viewer requis seulement pour certains flows
        const needsViewer = purpose !== "login";
        const viewer = needsViewer ? await requireViewer(req, res) : null;

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

        const now = new Date();
        if (row.expiresAt <= now) return fail(res, 400, "Code expired");
        if (row.attempts >= MAX_ATTEMPTS) return fail(res, 429, "Too many attempts");

        if (!timingSafeEqualHex(row.codeHash, codeHash)) {
            await db
                .update(authEmailCodes)
                .set({
                    attempts: sql`${authEmailCodes.attempts}
                    + 1`
                })
                .where(eq(authEmailCodes.id, row.id));

            return fail(res, 400, "Invalid code");
        }

        // consumed
        await db.update(authEmailCodes).set({consumedAt: new Date()}).where(eq(authEmailCodes.id, row.id));

        // ---- PURPOSE ACTIONS ----


        if (purpose === "login") {
            const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
            const user = existing ?? (await db.insert(users).values({email}).returning())[0];

            const s = await createAuthSession({userId: user.id, req});
            setLifeeSessionCookie(res, s.token, s.expiresAt);

            return ok(res, {status: "ok", purpose, userId: user.id});
        }

        // needs viewer from here
        if (!viewer) return fail(res, 401, "Unauthorized");

        if (purpose === "change_email") {
            const free = await ensureEmailFree(email, viewer.user.id);
            if (!free) return fail(res, 409, "Email already in use");

            await db.update(users).set({email}).where(eq(users.id, viewer.user.id));
            return ok(res, {status: "ok", purpose});
        }

        if (purpose === "link_guest") {
            if (!isGuestEmail(viewer.user.email)) return fail(res, 409, "Not a guest session");

            const free = await ensureEmailFree(email);
            if (!free) return fail(res, 409, "Email already in use"); // utiliser merge_into_existing

            await db.update(users).set({email}).where(eq(users.id, viewer.user.id));
            return ok(res, {status: "ok", purpose, userId: viewer.user.id});
        }

        if (purpose === "merge_into_existing") {
            if (!isGuestEmail(viewer.user.email)) return fail(res, 409, "Not a guest session");

            const target = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
            if (!target) return fail(res, 404, "Target account not found");

            await mergeGuestIntoExisting({guestUserId: viewer.user.id, targetUserId: target.id});

            // nouvelle session sur target
            const s = await createAuthSession({userId: target.id, req});
            setLifeeSessionCookie(res, s.token, s.expiresAt);

            return ok(res, {status: "ok", purpose, userId: target.id});
        }

        return fail(res, 400, "Unsupported purpose");
    },
});
