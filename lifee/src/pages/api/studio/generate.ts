import type { NextApiRequest, NextApiResponse } from "next";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireUserId } from "./_auth";
import {appUsers} from "@/lib/db/schema.auth";
import {studioAssets} from "@/lib/db/schema.studio";
import {createVideoKey} from "@/pages/api/webhooks/replicate";

function toMMYYYY(month: number, year: number) {
    return `${String(month).padStart(2, "0")}/${year}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as { sourceAssetId: string; durationSec: number; prompt: string };
    if (!body?.sourceAssetId || !body?.durationSec) return res.status(400).send("Missing fields");

    const [user] = await db.select({ credits: appUsers.credits }).from(appUsers).where(eq(appUsers.id, userId));
    if ((user?.credits ?? 0) <= 0) return res.status(402).send("No credits");

    const [source] = await db
        .select()
        .from(studioAssets)
        .where(and(eq(studioAssets.id, body.sourceAssetId), eq(studioAssets.userId, userId)));

    if (!source) return res.status(404).send("Source asset not found");

    // debit credit
    await db.update(appUsers).set({ credits: sql`${appUsers.credits} - 1` }).where(eq(appUsers.id, userId));

    // TODO GENERATE VIDEO IF IT WORKS THEN DEBIT CREDIT
    // FOR VIDEO GENERATION USE
    const videoKey = await createVideoKey()

    const [created] = await db
        .insert(studioAssets)
        .values({
            userId,
            type: "video",
            title: `${source.title} (AI)`,
            month: source.month,
            year: source.year,
            durationSec: Math.max(1, Math.min(30, Math.floor(body.durationSec))),
            thumbnailKey: source.thumbnailKey ?? source.fileKey,
            fileKey: videoKey,
            isGenerated: true,
            context: body.prompt ?? null,
        })
        .returning();

    res.status(200).json({
        id: created.id,
        type: "video",
        title: created.title,
        date: toMMYYYY(created.month, created.year),
        duration: created.durationSec ? `${created.durationSec}s` : undefined,
        thumbnailKey: created.thumbnailKey ?? undefined,
        fileKey: created.fileKey,
        isGenerated: true,
        context: created.context ?? undefined,
    });
}
