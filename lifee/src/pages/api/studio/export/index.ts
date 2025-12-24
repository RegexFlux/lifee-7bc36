// pages/api/studio/export/index.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, desc, eq, inArray} from "drizzle-orm";

import {db} from "@/lib/db";
import {requireUserId} from "../_auth";
import {exportJobs, timelineClips} from "@/lib/db/schema.studio";
import {consumeRateLimit, HttpError} from "@/lib/security/rateLimit";

type ExportCreateBody = { timelineClipIds: string[]; musicId?: string | null };
type ExportCreateOk = { jobId: string; reused?: boolean };
type ApiErr = { error: string; retryAfterSec?: number };

const ACTIVE_STATUSES = ["queued", "rendering"] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ExportCreateOk | ApiErr>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});

    try {
        const body = req.body as ExportCreateBody;
        if (!Array.isArray(body?.timelineClipIds)) return res.status(400).json({error: "Invalid timelineClipIds"});

        const clipIds = Array.from(new Set(body.timelineClipIds.map((x) => String(x)).filter(Boolean)));
        if (clipIds.length === 0) return res.status(400).json({error: "Empty timeline"});

        // ✅ 1) Un seul export actif à la fois (sinon on renvoie l’existant)
        const [active] = await db
            .select({id: exportJobs.id})
            .from(exportJobs)
            .where(and(eq(exportJobs.userId, userId), inArray(exportJobs.status, ACTIVE_STATUSES as any)))
            .orderBy(desc(exportJobs.createdAt))
            .limit(1);

        if (active) {
            return res.status(200).json({jobId: active.id, reused: true});
        }

        // ✅ 2) Rate-limit (ex: 10 exports / heure / user)
        await consumeRateLimit({key: `export:user:${userId}`, max: 10, windowSec: 3600});

        // ✅ 3) Ownership check (anti-IDOR) : on vérifie uniquement les IDs demandés
        const owned = await db
            .select({id: timelineClips.id})
            .from(timelineClips)
            .where(and(eq(timelineClips.userId, userId), inArray(timelineClips.id, clipIds)));

        if (owned.length !== clipIds.length) {
            return res.status(403).json({error: "Forbidden (clip ownership)"});
        }

        const [job] = await db
            .insert(exportJobs)
            .values({
                userId,
                status: "queued",
                progress: 0,
                musicTrackId: body.musicId ?? null,
            })
            .returning({id: exportJobs.id});

        // ⚠️ TODO prod: queue/worker. Ici simulation.
        void (async () => {
            try {
                await new Promise((r) => setTimeout(r, 150));
                await db.update(exportJobs).set({status: "rendering", progress: 10}).where(eq(exportJobs.id, job.id));

                for (let p = 10; p <= 100; p += 18) {
                    await new Promise((r) => setTimeout(r, 600));
                    await db.update(exportJobs).set({progress: Math.min(100, p)}).where(eq(exportJobs.id, job.id));
                }

                await db.update(exportJobs).set({
                    status: "done",
                    progress: 100,
                    url: "/examples/showcase/video.mp4"
                }).where(eq(exportJobs.id, job.id));
            } catch {
                await db.update(exportJobs).set({status: "error"}).where(eq(exportJobs.id, job.id));
            }
        })();

        return res.status(200).json({jobId: job.id});
    } catch (e: any) {
        const status = Number(e?.statusCode) || 500;
        const retryAfterSec = typeof e?.retryAfterSec === "number" ? e.retryAfterSec : undefined;
        return res.status(status).json({error: e?.message || "Export failed", retryAfterSec});
    }
}
