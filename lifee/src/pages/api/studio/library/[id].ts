import type { NextApiRequest, NextApiResponse } from "next";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireUserId } from "../_auth";
import { studioAssets, timelineClips } from "@/lib/db/schema";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const assetId = req.query.id as string;

    if (req.method === "DELETE") {
        // ✅ Vérifie ownership
        const [asset] = await db
            .select({ id: studioAssets.id })
            .from(studioAssets)
            .where(and(eq(studioAssets.id, assetId), eq(studioAssets.userId, userId)));

        if (!asset) return res.status(404).send("Not found");

        // Supprime clips + asset (cascade possible si FK onDelete=cascade)
        await db.delete(timelineClips).where(and(eq(timelineClips.assetId, assetId), eq(timelineClips.userId, userId)));
        await db.delete(studioAssets).where(and(eq(studioAssets.id, assetId), eq(studioAssets.userId, userId)));

        return res.status(200).json({ ok: true });
    }

    return res.status(405).send("Method not allowed");
}
