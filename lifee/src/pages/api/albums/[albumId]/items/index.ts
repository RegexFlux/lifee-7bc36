import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, asc, eq, isNull, sql} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albumItems, albums, assets} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";
import {getSignExpires} from "@/lib/s3/client";

const zAdd = z.object({
    assetIds: z.array(z.string().uuid()).min(1).max(50),
});

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
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

        const rows = await db
            .select({
                itemId: albumItems.id,
                position: albumItems.position,
                assetId: assets.id,
                type: assets.type,
                title: assets.title,
                fileKey: assets.fileKey,
                thumbnailKey: assets.thumbnailKey,
                year: assets.year,
                month: assets.month,
                createdAt: albumItems.createdAt,
                updatedAt: albumItems.updatedAt,
                description: assets.description,
            })
            .from(albumItems)
            .innerJoin(assets, eq(assets.id, albumItems.assetId))
            .where(
                and(
                    eq(albumItems.albumId, albumId),
                    eq(assets.userId, viewer.user.id),
                    isNull(assets.deletedAt)
                )
            )
            .orderBy(asc(albumItems.position))
            .limit(500);

        const expiresIn = getSignExpires();
        const items = await Promise.all(
            rows.map(async (r) => {
                const thumbKey = r.thumbnailKey ?? r.fileKey;
                const thumbnailUrl = await presignGetObject({key: thumbKey, expiresIn});
                return {
                    id: r.itemId,
                    position: r.position,
                    asset: {
                        id: r.assetId,
                        type: r.type,
                        title: r.title,
                        year: r.year,
                        month: r.month,
                        description: r.description,
                    },
                    thumbnailUrl,
                };
            })
        );

        return ok(res, {items, expiresInSec: expiresIn});
    },

    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const albumId = Array.isArray(req.query.albumId) ? req.query.albumId[0] : req.query.albumId;
        if (!albumId) return fail(res, 400, "Missing album id");

        const parsed = zAdd.safeParse(req.body ?? {});
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const a = (
            await db
                .select({id: albums.id})
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!a) return fail(res, 404, "Album not found");

        const assetRows = await db
            .select({id: assets.id})
            .from(assets)
            .where(and(eq(assets.userId, viewer.user.id), isNull(assets.deletedAt)));

        const allowed = new Set(assetRows.map((x) => x.id));
        for (const id of parsed.data.assetIds) {
            if (!allowed.has(id)) return fail(res, 403, "Invalid asset id");
        }

        const nextPosRow = (
            await db
                .select({
                    maxPos: sql<number>`COALESCE(MAX(
                    ${albumItems.position}
                    ),
                    0
                    )`
                })
                .from(albumItems)
                .where(eq(albumItems.albumId, albumId))
                .limit(1)
        )[0];
        const base = Number(nextPosRow?.maxPos ?? 0);

        const inserted = await db.transaction(async (tx) => {
            const rows = await tx
                .insert(albumItems)
                .values(
                    parsed.data.assetIds.map((assetId, i) => ({
                        albumId,
                        assetId,
                        position: base + i + 1,
                        updatedAt: new Date(),
                    }))
                )
                .returning();
            await tx.update(albums).set({updatedAt: new Date()}).where(eq(albums.id, albumId));
            return rows;
        });

        return ok(res, {inserted}, 201);
    },
});
