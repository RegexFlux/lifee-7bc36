// File: pages/api/share/exports/[id].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {exportJobs, exportShares, albums, users, albumItems, assets} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/aws/s3/presignGet";
import albumId from "@/pages/api/albums/[albumId]";
import {AlbumDto, AlbumItemDto} from "@/types/studioHelp";
import {AlbumItem} from "@/lib/db/types";

function makeCreatedLabel(d?: Date | string | null) {
    try {
        const dt = d ? new Date(d as any) : null;
        if (!dt || Number.isNaN(dt.getTime())) return "Créé récemment";
        return `Créé le ${new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(dt)}`;
    } catch {
        return "Créé récemment";
    }
}

function makeCreatedBy(email?: string | null) {
    if (!email) return "un proche";
    const left = email.split("@")[0] || "";
    return left.slice(0, 18) || "un proche";
}

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const shareId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!shareId) return fail(res, 400, "Missing share id");

        const row = (
            await db
                .select({
                    albumId: albums.id,
                    shareId: exportShares.id,
                    isActive: exportShares.isActive,
                    revokedAt: exportShares.revokedAt,

                    exportJobId: exportJobs.id,
                    status: exportJobs.status,
                    progress: exportJobs.progress,
                    videoKey: exportJobs.videoKey,
                    errorMessage: exportJobs.errorMessage,
                    createdAt: exportJobs.createdAt,

                    albumTitle: albums.title,
                    ownerEmail: users.email,
                })
                .from(exportShares)
                .innerJoin(exportJobs, eq(exportJobs.id, exportShares.exportJobId))
                .innerJoin(albums, eq(albums.id, exportJobs.albumId))
                .innerJoin(users, eq(users.id, exportJobs.userId))
                .where(and(eq(exportShares.id, shareId), eq(exportShares.isActive, true)))
                .limit(1)
        )[0];

        if (!row) return fail(res, 404, "Not found");

        let videoUrl: string | null = null;
        if (row.videoKey) {
            videoUrl = await presignGetObject({key: row.videoKey, expiresIn: 60 * 15});
        }

        // thumbnailUrl : pour un export complet, tu peux laisser null.
        // (Plus tard: si tu génères un poster export, mets-le ici)
        const thumbnailUrl: string | null = null;

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, row.albumId),
        }) as AlbumDto | undefined;

        const items = await db
            .select({
                albumItem: albumItems,
                asset: assets,
            })
            .from(albumItems)
            .innerJoin(assets, eq(assets.id, albumItems.assetId))
            .where(eq(albumItems.albumId, row.albumId));

        if (album) {
            const mapped = items.map(async (item) => ({
                ...item.albumItem,
                asset: item.asset,
                thumbnailUrl: item.asset.thumbnailKey ? await presignGetObject({
                    key: item.asset.thumbnailKey,
                    expiresIn: 60 * 60
                }) : undefined,
            } as AlbumItemDto));
            album.items = await Promise.all(mapped);
        }

        return ok(res, {
            album,
            exportJobId: row.exportJobId,
            albumTitle: row.albumTitle,
            status: row.status,
            progress: row.progress,
            videoUrl,
            thumbnailUrl,
            errorMessage: row.errorMessage ?? null,
            createdLabel: makeCreatedLabel(row.createdAt),
            createdBy: makeCreatedBy(row.ownerEmail),
            expiresInSec: 60 * 15,
        });
    },
});
