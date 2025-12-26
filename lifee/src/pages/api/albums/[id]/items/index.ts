// pages/api/albums/[id]/items/index.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, isNull, asc} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albums, albumItems, assets} from "@/lib/db/schema";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const albumId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!albumId) return fail(res, 400, "Missing album id");

        const album = (
            await db
                .select({id: albums.id})
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!album) return fail(res, 404, "Album not found");

        const rows = await db
            .select({
                item: albumItems,
                asset: assets,
            })
            .from(albumItems)
            .innerJoin(assets, eq(assets.id, albumItems.assetId))
            .where(and(eq(albumItems.albumId, albumId), isNull(assets.deletedAt)))
            .orderBy(asc(albumItems.position));

        return ok(res, {
            items: rows.map((r) => ({...r.item, asset: r.asset})),
        });
    },
});
