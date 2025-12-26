// File: pages/api/share/exports/[exportShareId]/image.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, asc, eq, isNull} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {exportShares, exportJobs, albumItems, assets} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const exportShareId = Array.isArray(req.query.id)
            ? req.query.id[0]
            : req.query.id;

        if (!exportShareId) return fail(res, 400, "Missing id");

        const share = (
            await db
                .select({
                    exportJobId: exportShares.exportJobId,
                })
                .from(exportShares)
                .where(and(eq(exportShares.id, exportShareId), eq(exportShares.isActive, true), isNull(exportShares.revokedAt)))
                .limit(1)
        )[0];

        if (!share) return fail(res, 404, "Not found");

        const first = (
            await db
                .select({
                    fileKey: assets.fileKey,
                    thumbnailKey: assets.thumbnailKey,
                })
                .from(exportJobs)
                .innerJoin(albumItems, eq(albumItems.albumId, exportJobs.albumId))
                .innerJoin(assets, eq(assets.id, albumItems.assetId))
                .where(and(eq(exportJobs.id, share.exportJobId), isNull(assets.deletedAt)))
                .orderBy(asc(albumItems.position))
                .limit(1)
        )[0];

        if (!first) return fail(res, 404, "No items");

        const key = first.thumbnailKey || first.fileKey;
        const url = await presignGetObject({key, expiresIn: 60 * 10});

        res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
        res.writeHead(302, {Location: url});
        res.end();
    },
});
