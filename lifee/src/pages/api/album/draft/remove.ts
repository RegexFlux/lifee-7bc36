import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";
import {db} from "@/lib/db";
import {requireUserId} from "@/pages/api/studio/_auth";
import {albumDrafts, albumDraftItems} from "@/lib/db/schema.album";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as { draftId: string; assetId: string };
    if (!body?.draftId || !body?.assetId) return res.status(400).send("Missing draftId/assetId");

    const [draft] = await db
        .select({id: albumDrafts.id})
        .from(albumDrafts)
        .where(and(eq(albumDrafts.id, body.draftId), eq(albumDrafts.userId, userId)));

    if (!draft) return res.status(404).send("Draft not found");

    await db
        .delete(albumDraftItems)
        .where(and(eq(albumDraftItems.draftId, body.draftId), eq(albumDraftItems.assetId, body.assetId)));

    await db.update(albumDrafts).set({updatedAt: new Date()} as any).where(eq(albumDrafts.id, body.draftId));

    return res.status(200).json({ok: true});
}
