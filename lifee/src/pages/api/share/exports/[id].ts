// pages/api/share/exports/[id].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {exportJobs, exportShares, albums} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const shareId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!shareId) return fail(res, 400, "Missing share id");

        const row = (
            await db
                .select({
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
                })
                .from(exportShares)
                .innerJoin(exportJobs, eq(exportJobs.id, exportShares.exportJobId))
                .innerJoin(albums, eq(albums.id, exportJobs.albumId))
                .where(and(eq(exportShares.id, shareId), eq(exportShares.isActive, true)))
                .limit(1)
        )[0];

        if (!row) return fail(res, 404, "Not found");

        let videoUrl: string | null = null;
        if (row.videoKey) {
            videoUrl = await presignGetObject({key: row.videoKey, expiresIn: 60 * 15});
        }

        return ok(res, {
            shareId: row.shareId,
            exportJobId: row.exportJobId,
            albumTitle: row.albumTitle,
            status: row.status,
            progress: row.progress,
            videoUrl,
            errorMessage: row.errorMessage ?? null,
            createdAt: row.createdAt,
            expiresInSec: 60 * 15,
        });
    },
});
