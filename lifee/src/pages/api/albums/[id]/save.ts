// pages/api/albums/[id]/save.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albums, albumItems} from "@/lib/db/schema";

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const albumId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!albumId) return fail(res, 400, "Missing album id");

        const album = (
            await db
                .select()
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!album) return fail(res, 404, "Album not found");

        const hasItems = (
            await db.select({id: albumItems.id}).from(albumItems).where(eq(albumItems.albumId, albumId)).limit(1)
        )[0];
        if (!hasItems) return fail(res, 400, "Album is empty");

        const [updated] = await db
            .update(albums)
            .set({
                mode: "studio_pro",
                updatedAt: new Date(),
            })
            .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
            .returning();

        return ok(res, {album: updated});
    },
});
