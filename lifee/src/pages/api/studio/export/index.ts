import type { NextApiRequest, NextApiResponse } from "next";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireUserId } from "../_auth";
import { exportJobs, timelineClips} from "@/lib/db/schema.studio";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as { timelineClipIds: string[]; musicId?: string | null };
    if (!Array.isArray(body?.timelineClipIds)) return res.status(400).send("Invalid timelineClipIds");

    // ✅ ensure these clips belong to user (anti IDOR)
    if (body.timelineClipIds.length > 0) {
        const clips = await db
            .select({ id: timelineClips.id })
            .from(timelineClips)
            .where(eq(timelineClips.userId, userId));

        const owned = new Set(clips.map((c) => c.id));
        for (const id of body.timelineClipIds) {
            if (!owned.has(id)) return res.status(403).send("Forbidden (clip ownership)");
        }
    }

    const [job] = await db
        .insert(exportJobs)
        .values({
            userId,
            status: "queued",
            progress: 0,
            musicTrackId: body.musicId ?? null,
        })
        .returning();

    // Simule rendu: update progress async (en prod = queue worker)
    void (async () => {
        try {
            await new Promise((r) => setTimeout(r, 150));
            await db.update(exportJobs).set({ status: "rendering", progress: 10 }).where(eq(exportJobs.id, job.id));

            for (let p = 10; p <= 100; p += 18) {
                // eslint-disable-next-line no-await-in-loop
                await new Promise((r) => setTimeout(r, 600));
                // eslint-disable-next-line no-await-in-loop
                await db.update(exportJobs).set({ progress: Math.min(100, p) }).where(eq(exportJobs.id, job.id));
            }

            await db
                .update(exportJobs)
                .set({ status: "done", progress: 100, url: "/fake/video.mp4" })
                .where(eq(exportJobs.id, job.id));
        } catch {
            await db.update(exportJobs).set({ status: "error" }).where(eq(exportJobs.id, job.id));
        }
    })();

    res.status(200).json({ jobId: job.id });
}
