// pages/api/album/packs.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {requireUserId} from "@/pages/api/studio/_auth";
import {db} from "@/lib/db";
import {albumDraftItems, albumDrafts} from "@/lib/db/schema.album";
import {and, eq} from "drizzle-orm";
import {listPacksForUser, recommendPackId} from "@/lib/album/packs.server";
import {PacksResponseSchema, type PacksResponse} from "@/types/billing";
import {studioAssets} from "@/lib/db/schema.studio";

export default async function handler(req: NextApiRequest, res: NextApiResponse<PacksResponse | { error: string }>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "GET") return res.status(405).json({error: "Method not allowed"});

    const draftId = typeof req.query.draftId === "string" ? req.query.draftId : null;

    const packs = listPacksForUser(userId);

    let recommendedPackId: string | null = null;
    if (draftId) {
        const [draft] = await db
            .select({id: albumDrafts.id})
            .from(albumDrafts)
            .where(and(eq(albumDrafts.id, draftId), eq(albumDrafts.userId, userId)));

        if (draft) {
            const rows = await db
                .select({
                    type: studioAssets.type,
                })
                .from(albumDraftItems)
                .innerJoin(studioAssets, and(eq(studioAssets.id, albumDraftItems.assetId)))
                .where(eq(albumDraftItems.draftId, draft.id));
            recommendedPackId = recommendPackId(packs, rows.filter(x => x.type === 'video').length) ?? null;
        }
    }

    const payload: PacksResponse = {packs, recommendedPackId};
    // runtime safety
    PacksResponseSchema.parse(payload);

    return res.status(200).json(payload);
}
