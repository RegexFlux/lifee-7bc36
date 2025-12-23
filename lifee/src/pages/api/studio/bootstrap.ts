import type { NextApiRequest, NextApiResponse } from "next";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireUserId } from "./_auth";
import { musicTracks, studioAssets, timelineClips} from "@/lib/db/schema.studio";
import {appUsers} from "@/lib/db/schema.auth";
import {presignGet} from "@/lib/s3";

function toMMYYYY(month: number, year: number) {
    return `${String(month).padStart(2, "0")}/${year}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const [userId] = await Promise.all([requireUserId(req, res)]);
    if (!userId) return;

    // ensure user row
    await db.insert(appUsers).values({ id: userId, email: 'decalere@gmail.com' }).onConflictDoNothing();

    const [user] = await db.select({ credits: appUsers.credits }).from(appUsers).where(eq(appUsers.id, userId));
    const credits = user?.credits ?? 0;

    const libraryRows = await db
        .select()
        .from(studioAssets)
        .where(eq(studioAssets.userId, userId))
        .orderBy(desc(studioAssets.createdAt));

    const clipRows = await db
        .select()
        .from(timelineClips)
        .where(eq(timelineClips.userId, userId))
        .orderBy(asc(timelineClips.position));

    // Join assets for timeline
    const assetIds = clipRows.map((c) => c.assetId);
    const assetsRows =
        assetIds.length === 0
            ? []
            : await db
                .select()
                .from(studioAssets)
                .where(eq(studioAssets.userId, userId)); // user scope; mapping below

    const map = new Map(assetsRows.map((a) => [a.id, a]));

    let timeline = [];
    for (const c of clipRows) {
        const a = map.get(c.assetId);
        if (!a) return null;
        const thumbnailUrl = a.thumbnailKey ? await presignGet(a.thumbnailKey) : undefined;

        timeline.push({
            id: a.id,
            type: a.type,
            title: a.title,
            date: toMMYYYY(a.month, a.year),
            duration: a.durationSec ? `${a.durationSec}s` : undefined,
            thumbnailUrl: thumbnailUrl,
            isGenerated: a.isGenerated,
            context: (c.context ?? a.context) ?? undefined,

            source: (c.source as "library" | "generated") ?? "library",
        });
    }
    timeline = timeline.filter(Boolean);

    const musicPresets = await db
        .select()
        .from(musicTracks)
        .where(eq(musicTracks.isActive, true));

    const library = [];
    for (const a of libraryRows) {
        const thumbnailUrl = a.thumbnailKey ? await presignGet(a.thumbnailKey) : undefined;
        library.push({
            id: a.id,
                type: a.type,
                title: a.title,
                date: toMMYYYY(a.month, a.year),
                duration: a.durationSec ? `${a.durationSec}s` : undefined,
                thumbnailUrl: thumbnailUrl,
                isGenerated: a.isGenerated,
                context: a.context ?? undefined,
        });
    }

    res.status(200).json({
        credits,
        library: library,
        timeline,
        musicPresets,
    });
}
