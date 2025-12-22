import type { NextApiRequest, NextApiResponse } from "next";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireUserId } from "../_auth";
import { timelineClips} from "@/lib/db/schema.studio";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "PUT") return res.status(405).send("Method not allowed");

    const body = req.body as { orderedClipIds: string[] };
    if (!Array.isArray(body?.orderedClipIds)) return res.status(400).send("Invalid orderedClipIds");

    // ✅ user-scoped update; any clipId not belonging to user will be ignored by WHERE user_id = ...
    await db.transaction(async (tx) => {
        for (let i = 0; i < body.orderedClipIds.length; i++) {
            const clipId = body.orderedClipIds[i];
            await tx.execute(sql`
                UPDATE timeline_clips
                SET position = ${i}
                WHERE id = ${clipId} AND user_id = ${userId}
            `);
        }
    });

    // Optional: normalize positions for safety
    await db.update(timelineClips).set({}).where(eq(timelineClips.userId, userId));

    return res.status(200).json({ ok: true });
}
