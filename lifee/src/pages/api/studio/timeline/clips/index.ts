import type { NextApiRequest, NextApiResponse } from "next";
import { and, eq, sql, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireUserId } from "../../_auth";
import { studioAssets, timelineClips} from "@/lib/db/schema.studio";

function toMMYYYY(month: number, year: number) {
    return `${String(month).padStart(2, "0")}/${year}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as { assetId: string; position?: number | null };
    if (!body?.assetId) return res.status(400).send("Missing assetId");

    // ✅ ownership check on asset
    const [asset] = await db
        .select()
        .from(studioAssets)
        .where(and(eq(studioAssets.id, body.assetId), eq(studioAssets.userId, userId)));

    if (!asset) return res.status(404).send("Asset not found");

    // compute position (append by default)
    let position: number;
    if (typeof body.position === "number") {
        position = Math.max(0, Math.floor(body.position));
        // shift existing clips to make room
        await db.execute(sql`
      UPDATE timeline_clips
      SET position = position + 1
      WHERE user_id = ${userId} AND position >= ${position}
    `);
    } else {
        const [last] = await db
            .select({ position: timelineClips.position })
            .from(timelineClips)
            .where(eq(timelineClips.userId, userId))
            .orderBy(desc(timelineClips.position))
            .limit(1);

        position = (last?.position ?? -1) + 1;
    }

    const [clip] = await db
        .insert(timelineClips)
        .values({
            userId,
            assetId: asset.id,
            position,
            source: asset.isGenerated ? "generated" : "library",
            context: asset.context ?? null,
        })
        .returning();

    // Return TimelineItem shape
    return res.status(200).json({
        assetId: asset.id,
        type: asset.type,
        title: asset.title,
        date: toMMYYYY(asset.month, asset.year),
        duration: asset.durationSec ? `${asset.durationSec}s` : undefined,
        thumbnailUrl: asset.thumbnailUrl ?? undefined,
        isGenerated: asset.isGenerated,
        context: asset.context ?? undefined,

        id: clip.id,
        source: (clip.source as "library" | "generated") ?? "library",
    });
}
