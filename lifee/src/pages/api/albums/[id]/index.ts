// pages/api/albums/[id]/index.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albums} from "@/lib/db/schema";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const albumId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!albumId) return fail(res, 400, "Missing album id");

        const row = (
            await db
                .select()
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!row) return fail(res, 404, "Not found");

        return ok(res, {album: row});
    },
});
