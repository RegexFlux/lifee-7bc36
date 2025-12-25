// pages/api/auth/merge/confirm.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, eq} from "drizzle-orm";

import {db} from "@/lib/db";
import {accountLinks, albums, assets, creditEvents, creditPurchases, users} from "@/lib/db/schema";
import {getOrCreateViewer} from "@/lib/auth/viewer";

const zBody = z.object({
    accountLinkId: z.string().uuid(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});

    const viewer = await getOrCreateViewer(req, res);

    const parsed = zBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({error: "Invalid body", details: parsed.error.flatten()});

    const {accountLinkId} = parsed.data;

    const link = (await db.select().from(accountLinks).where(eq(accountLinks.id, accountLinkId)).limit(1))[0];
    if (!link) return res.status(404).json({error: "Not found"});

    if (link.status !== "pending") return res.status(400).json({error: "Link not pending"});
    if (link.targetUserId !== viewer.user.id) return res.status(403).json({error: "Forbidden"});

    const guestId = link.guestUserId;
    const targetId = link.targetUserId;

    await db.transaction(async (tx) => {
        // Transfer ownership
        await tx.update(assets).set({userId: targetId}).where(eq(assets.userId, guestId));
        await tx.update(albums).set({userId: targetId}).where(eq(albums.userId, guestId));
        await tx.update(creditPurchases).set({userId: targetId}).where(eq(creditPurchases.userId, guestId));
        await tx.update(creditEvents).set({userId: targetId}).where(eq(creditEvents.userId, guestId));

        // Mark link completed
        await tx
            .update(accountLinks)
            .set({status: "completed", completedAt: new Date()})
            .where(and(eq(accountLinks.id, accountLinkId), eq(accountLinks.status, "pending")));

        // Optionnel: neutraliser le guest (sans le supprimer)
        // (utile si tu veux garder une trace minimale et éviter réutilisation)
        await tx.update(users).set({credits: 0}).where(eq(users.id, guestId));
    });

    return res.status(200).json({status: "ok"});
}
