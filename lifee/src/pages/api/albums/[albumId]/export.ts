// pages/api/albums/[id]/export.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, desc, eq, inArray} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albums, exportJobs} from "@/lib/db/schema";

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
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

        // si job actif existe -> renvoyer
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

        if (active) return ok(res, {exportJob: active});

        const [job] = await db
            .insert(exportJobs)
            .values({
                userId: viewer.user.id,
                albumId,
                status: "queued",
                progress: 0,
            })
            .returning();

        return ok(res, {exportJob: job}, 201);
    },
});
