// pages/api/albums/[id]/items/reorder.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, desc, eq, inArray} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albumItems, albums, exportJobs} from "@/lib/db/schema";

const zBody = z.object({
    orderedItemIds: z.array(z.string().uuid()).min(1).max(500),
});

export default apiHandler({
    PATCH: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const albumId = Array.isArray(req.query.albumId) ? req.query.albumId[0] : req.query.albumId;
        if (!albumId) return fail(res, 400, "Missing album id");

        const parsed = zBody.safeParse(req.body ?? {});
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

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

        await db.transaction(async (tx) => {
            // atomic-ish reorder
            for (let i = 0; i < parsed.data.orderedItemIds.length; i++) {
                const id = parsed.data.orderedItemIds[i];
                await tx
                    .update(albumItems)
                    .set({position: i + 1, updatedAt: new Date()})
                    .where(and(eq(albumItems.id, id), eq(albumItems.albumId, albumId)));
            }
            await tx.update(albums).set({updatedAt: new Date()}).where(eq(albums.id, albumId));
        });

        return ok(res, {status: "ok"});
    },
});
