// pages/api/albums/[id]/items/reorder.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albums, albumItems} from "@/lib/db/schema";

const zBody = z.object({
    orderedItemIds: z.array(z.string().uuid()).min(1).max(800),
});

export default apiHandler({
    PATCH: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const albumId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!albumId) return fail(res, 400, "Missing album id");

        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const album = (
            await db
                .select({id: albums.id})
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!album) return fail(res, 404, "Album not found");

        // Reorder transaction (loop OK <= 800)
        try {
            await db.transaction(async (tx) => {
                for (let i = 0; i < parsed.data.orderedItemIds.length; i++) {
                    const itemId = parsed.data.orderedItemIds[i];
                    const nextPos = i + 1;

                    const [row] = await tx
                        .update(albumItems)
                        .set({position: nextPos, updatedAt: new Date()})
                        .where(and(eq(albumItems.id, itemId), eq(albumItems.albumId, albumId)))
                        .returning({id: albumItems.id});

                    if (!row) {
                        const e: any = new Error("Invalid reorder list");
                        e.status = 409;
                        throw e;
                    }
                }

                await tx.update(albums).set({updatedAt: new Date()}).where(eq(albums.id, albumId));
            });
        } catch (e: any) {
            return fail(res, typeof e?.status === "number" ? e.status : 500, e?.message || "Reorder failed");
        }

        return ok(res, {status: "ok"});
    },
});
