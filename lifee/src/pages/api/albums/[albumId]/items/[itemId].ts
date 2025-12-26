// pages/api/albums/[albumId]/items/[itemId].ts
import type {NextApiRequest, NextApiResponse} from "next";

import {and, desc, eq, inArray} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albumItems, albums, exportJobs} from "@/lib/db/schema";

export default apiHandler({
    DELETE: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const albumId = Array.isArray(req.query.albumId) ? req.query.albumId[0] : req.query.albumId;
        const itemId = Array.isArray(req.query.itemId) ? req.query.itemId[0] : req.query.itemId;

        if (!albumId) return fail(res, 400, "Missing albumId");
        if (!itemId) return fail(res, 400, "Missing itemId");

        const a = (
            await db
                .select({id: albums.id})
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!a) return fail(res, 404, "Album not found");

        const active = (
            await db
                .select()
                .from(exportJobs)
                .where(
                    and(
                        eq(exportJobs.albumId, albumId),
                        eq(exportJobs.userId, viewer.user.id),
                        inArray(exportJobs.status, ["queued", "rendering"])
                    )
                )
                .orderBy(desc(exportJobs.createdAt))
                .limit(1)
        )[0];
        if (active) {
            return fail(res, 403, "Export already running")
        }

        const [deleted] = await db
            .delete(albumItems)
            .where(and(eq(albumItems.id, itemId), eq(albumItems.albumId, albumId)))
            .returning();

        if (!deleted) return fail(res, 404, "Item not found");

        await db.update(albums).set({updatedAt: new Date()}).where(eq(albums.id, albumId));
        return ok(res, {status: "ok"});
    },
});
