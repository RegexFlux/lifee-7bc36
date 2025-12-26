// File: pages/api/albums/[id]/exports.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, desc, eq, inArray} from "drizzle-orm";
import {z} from "zod";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db/index";
import {albums, exportJobs} from "@/lib/db/schema";

const zQuery = z.object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
});

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const albumId = Array.isArray(req.query.albumId) ? req.query.albumId[0] : req.query.albumId;
        if (!albumId) return fail(res, 400, "Missing album id");

        const q = zQuery.safeParse(req.query);
        if (!q.success) return fail(res, 400, "Invalid query", q.error.flatten());

        // album guard
        const a = (
            await db
                .select({id: albums.id})
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!a) return fail(res, 404, "Album not found");

        const rows = await db
            .select()
            .from(exportJobs)
            .where(and(eq(exportJobs.albumId, albumId), eq(exportJobs.userId, viewer.user.id)))
            .orderBy(desc(exportJobs.createdAt))
            .limit(q.data.limit);

        return ok(res, {exports: rows, latest: rows[0] ?? null});
    },

    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const albumId = Array.isArray(req.query.albumId) ? req.query.albumId[0] : req.query.albumId;
        if (!albumId) return fail(res, 400, "Missing album id");

        const a = (
            await db
                .select({id: albums.id})
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!a) return fail(res, 404, "Album not found");

        // if an export is already running -> return it (idempotent UX)
        const running = (
            await db
                .select()
                .from(exportJobs)
                .where(
                    and(
                        eq(exportJobs.albumId, albumId),
                        eq(exportJobs.userId, viewer.user.id),
                        inArray(exportJobs.status, ["queued", "rendering"] as any)
                    )
                )
                .orderBy(desc(exportJobs.createdAt))
                .limit(1)
        )[0];

        if (running) return ok(res, {exportJob: running, mode: "existing"});

        const [created] = await db
            .insert(exportJobs)
            .values({
                albumId,
                userId: viewer.user.id,
                status: "queued",
                progress: 0,
            })
            .returning();

        return ok(res, {exportJob: created, mode: "created"}, 201);
    },
});
