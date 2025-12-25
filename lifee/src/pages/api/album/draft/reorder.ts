import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, inArray} from "drizzle-orm";
import {db} from "@/lib/db";
import {requireUserId} from "@/pages/api/studio/_auth";
import {albumDraftItems, albumDrafts} from "@/lib/db/schema.album";

type Body = { draftId: string; orderedAssetIds: string[] };

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ ok: true } | { error: string }>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});

    const body = req.body as Body;
    if (!body?.draftId || !Array.isArray(body.orderedAssetIds)) return res.status(400).json({error: "Invalid body"});

    const [draft] = await db.select().from(albumDrafts).where(and(eq(albumDrafts.id, body.draftId), eq(albumDrafts.userId, userId)));
    if (!draft) return res.status(404).json({error: "Draft not found"});

    const ids = body.orderedAssetIds.map(String);
    const items = await db.select({assetId: albumDraftItems.assetId}).from(albumDraftItems).where(eq(albumDraftItems.draftId, body.draftId));
    const owned = new Set(items.map((x) => x.assetId));
    if (ids.some((id) => !owned.has(id))) return res.status(403).json({error: "Forbidden (ownership)"});

    await db.transaction(async (tx) => {
        for (let i = 0; i < ids.length; i++) {
            await tx.update(albumDraftItems).set({position: i}).where(and(eq(albumDraftItems.draftId, body.draftId), eq(albumDraftItems.assetId, ids[i])));
        }
        await tx.update(albumDrafts).set({updatedAt: new Date()}).where(eq(albumDrafts.id, body.draftId));
    });

    return res.status(200).json({ok: true});
}
