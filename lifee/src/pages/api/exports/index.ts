// pages/api/exports/index.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, eq, gte} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albums, albumItems, exportJobs} from "@/lib/db/schema";

const Body = z.object({
    albumId: z.string().uuid(),
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const parsed = Body.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const {albumId} = parsed.data;

        const album = (
            await db
                .select({id: albums.id})
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!album) return fail(res, 404, "Album not found");

        // garde-fou: au moins 1 item
        const hasItems = (
            await db
                .select({id: albumItems.id})
                .from(albumItems)
                .where(eq(albumItems.albumId, albumId))
                .limit(1)
        )[0];
        if (!hasItems) return fail(res, 400, "Album is empty");

        // anti-spam simple: max 3 exports / 2 minutes
        const twoMinAgo = new Date(Date.now() - 120_000);
        const recent = await db
            .select({id: exportJobs.id})
            .from(exportJobs)
            .where(and(eq(exportJobs.userId, viewer.user.id), gte(exportJobs.createdAt, twoMinAgo)))
            .limit(3);
        if (recent.length >= 3) return fail(res, 429, "Too many requests");

        const [job] = await db
            .insert(exportJobs)
            .values({
                userId: viewer.user.id,
                albumId,
                status: "queued",
                progress: 0,
            })
            .returning();

        return ok(res, {job}, 201);
    },
});
