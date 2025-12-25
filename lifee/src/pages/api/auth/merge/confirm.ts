// pages/api/auth/merge/confirm.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {accountLinks, albums, assets, creditEvents, creditPurchases, users} from "@/lib/db/schema";
import {requireViewer} from "@/lib/auth/require";

const zBody = z.object({
    accountLinkId: z.string().uuid(),
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const link = (await db.select().from(accountLinks).where(eq(accountLinks.id, parsed.data.accountLinkId)).limit(1))[0];
        if (!link) return fail(res, 404, "Not found");
        if (link.status !== "pending") return fail(res, 400, "Link not pending");
        if (link.targetUserId !== viewer.user.id) return fail(res, 403, "Forbidden");

        const guestId = link.guestUserId;
        const targetId = link.targetUserId;

        await db.transaction(async (tx) => {
            await tx.update(assets).set({userId: targetId}).where(eq(assets.userId, guestId));
            await tx.update(albums).set({userId: targetId}).where(eq(albums.userId, guestId));
            await tx.update(creditPurchases).set({userId: targetId}).where(eq(creditPurchases.userId, guestId));
            await tx.update(creditEvents).set({userId: targetId}).where(eq(creditEvents.userId, guestId));

            await tx
                .update(accountLinks)
                .set({status: "completed", completedAt: new Date()})
                .where(and(eq(accountLinks.id, link.id), eq(accountLinks.status, "pending")));

            // neutralise le guest (optionnel mais safe)
            await tx.update(users).set({credits: 0}).where(eq(users.id, guestId));
        });

        return ok(res, {status: "ok"});
    },
});
