import type { NextApiRequest, NextApiResponse } from "next";
import { and, eq, asc, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireUserId } from "./_auth";
import { studioAssets, timelineClips, users, musicTracks } from "@/lib/db/schema";

function toMMYYYY(month: number, year: number) {
    return `${String(month).padStart(2, "0")}/${year}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId));
    const credits = user?.credits ?? 0;

    const library = await db
        .select()
        .from(studioAssets)
        .where(eq(studioAssets.userId, userId))
        .orderBy(desc(studioAssets.createdAt));

    const clips = await db
        .select()
        .from(timelineClips)
        .where(eq(timelineClips.userId, userId))
        .orderBy(asc(timelineClips.position));

    // join assets pour renvoyer le shape front
    const assetIds = clips.map((c) => c.assetId);
    const assetsById = new Map(
        (
            assetIds.length
                ? await db.select().from(studioAssets).where(and(eq(studioAssets.userId, userId))) // filtrage + puis map
                : []
        ).map((a) => [a.id, a])
    );

    const timeline = clips
        .map((c) => {
            const a = assetsById.get(c.assetId);
            if (!a) return null;
            return {
                id: a.id,
                type: a.type,
                title: a.title,
                date: toMMYYYY(a.month, a.year),
                duration: a.durationSec ? `${a.durationSec}s` : undefined,
                thumbnailUrl: a.thumbnailUrl,
                isGenerated: a.isGenerated,
                context: c.context ?? a.context ?? undefined,

                uniqueId: c.id, // ✅ clipId = uniqueId côté front
                source: c.source,
            };
        })
        .filter(Boolean);

    const musicPresets = await db
        .select()
        .from(musicTracks)
        .where(eq(musicTracks.isActive, true));

    res.status(200).json({
        credits,
        library: library.map((a) => ({
            id: a.id,
            type: a.type,
            title: a.title,
            date: toMMYYYY(a.month, a.year),
            duration: a.durationSec ? `${a.durationSec}s` : undefined,
            thumbnailUrl: a.thumbnailUrl,
            isGenerated: a.isGenerated,
            context: a.context ?? undefined,
        })),
        timeline,
        musicPresets,
    });
}
