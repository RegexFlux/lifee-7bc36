import type { NextApiRequest, NextApiResponse } from "next";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/index";
import { requireUserId } from "../../../_auth";
import { timelineClips} from "@/lib/db/schema.studio";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const clipId = req.query.clipId as string;

    if (req.method !== "DELETE") return res.status(405).send("Method not allowed");

    const [clip] = await db
        .select({ id: timelineClips.id })
        .from(timelineClips)
        .where(and(eq(timelineClips.id, clipId), eq(timelineClips.userId, userId)));

    if (!clip) return res.status(404).send("Not found");

    await db.delete(timelineClips).where(and(eq(timelineClips.id, clipId), eq(timelineClips.userId, userId)));

    return res.status(200).json({ ok: true });
}
