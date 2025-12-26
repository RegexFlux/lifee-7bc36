// pages/api/albums/[id]/items/bulk.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, eq, inArray, isNull, desc} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albums, albumItems, assets} from "@/lib/db/schema";

const zBody = z.object({
    assetIds: z.array(z.string().uuid()).min(1).max(300),
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const albumId = Array.isArray(req.query.albumId) ? req.query.albumId[0] : req.query.albumId;
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

        // assets owned + not deleted
        const owned = await db
            .select({id: assets.id})
            .from(assets)
            .where(
                and(
                    eq(assets.userId, viewer.user.id),
                    isNull(assets.deletedAt),
                    inArray(assets.id, parsed.data.assetIds)
                )
            );

        if (owned.length !== parsed.data.assetIds.length) return fail(res, 403, "Some assets are invalid");

        // avoid duplicates: exclude assetIds already in album
        const existing = await db
            .select({assetId: albumItems.assetId})
            .from(albumItems)
            .where(and(eq(albumItems.albumId, albumId), inArray(albumItems.assetId, parsed.data.assetIds)));

        const existingSet = new Set(existing.map((x) => x.assetId));
        const toInsert = parsed.data.assetIds.filter((id) => !existingSet.has(id));

        if (!toInsert.length) return ok(res, {albumItems: []}, 201);

        const last = (
            await db
                .select({position: albumItems.position})
                .from(albumItems)
                .where(eq(albumItems.albumId, albumId))
                .orderBy(desc(albumItems.position))
                .limit(1)
        )[0];

        const basePos = last?.position ?? 0;

        const rows = await db.transaction(async (tx) => {
            const values = toInsert.map((assetId, i) => ({
                albumId,
                assetId,
                position: basePos + i + 1,
            }));
            const inserted = await tx.insert(albumItems).values(values).returning();
            await tx.update(albums).set({updatedAt: new Date()}).where(eq(albums.id, albumId));
            return inserted;
        });

        return ok(res, {albumItems: rows}, 201);
    },
});
