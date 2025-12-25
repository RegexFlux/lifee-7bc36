import type {NextApiRequest, NextApiResponse} from "next";
import {and, asc, eq} from "drizzle-orm";
import {db} from "@/lib/db";
import {requireUserId} from "@/pages/api/studio/_auth";
import {albumDraftItems, albumDrafts} from "@/lib/db/schema.album";
import {recommendPacks} from "@/lib/album/packs.server";
import {studioAssets} from "@/lib/db/schema.studio";

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "GET") return res.status(405).json({error: "Method not allowed"});

    const draftId = String(req.query.draftId || "");
    if (!draftId) return res.status(400).json({error: "Missing draftId"});

    const [draft] = await db.select().from(albumDrafts).where(and(eq(albumDrafts.id, draftId), eq(albumDrafts.userId, userId)));
    if (!draft) return res.status(404).json({error: "Draft not found"});

    const items = await db
        .select({
            assetId: albumDraftItems.assetId,
            type: studioAssets.type,
        })
        .from(albumDraftItems)
        .innerJoin(studioAssets, and(eq(studioAssets.id, albumDraftItems.assetId)))
        .where(eq(albumDraftItems.draftId, draftId))
        .orderBy(asc(albumDraftItems.position));
    const requiredCredits = items.filter(x => x.type === 'image').length; // 1 photo -> 1 vidéo IA (dans ce flow)

    return res.status(200).json(recommendPacks(requiredCredits));
}
