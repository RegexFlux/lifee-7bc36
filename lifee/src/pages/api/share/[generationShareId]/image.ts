// File: pages/api/share/[generationShareId]/image.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, isNull} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {generationShares, replicateGenerationJobs, assets} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/aws/s3/presignGet";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const generationShareId = Array.isArray(req.query.generationShareId)
            ? req.query.generationShareId[0]
            : req.query.generationShareId;

        if (!generationShareId) return fail(res, 400, "Missing id");

        const row = (
            await db
                .select({
                    isActive: generationShares.isActive,
                    revokedAt: generationShares.revokedAt,
                    sourceAssetId: replicateGenerationJobs.createdByAssetId,
                    sourceFileKey: assets.fileKey,
                    sourceThumbnailKey: assets.thumbnailKey,
                })
                .from(generationShares)
                .innerJoin(replicateGenerationJobs, eq(replicateGenerationJobs.id, generationShares.generationJobId))
                .innerJoin(assets, eq(assets.id, replicateGenerationJobs.createdByAssetId))
                .where(and(eq(generationShares.id, generationShareId), eq(generationShares.isActive, true), isNull(generationShares.revokedAt)))
                .limit(1)
        )[0];

        if (!row) return fail(res, 404, "Not found");

        const key = row.sourceThumbnailKey || row.sourceFileKey;
        const url = await presignGetObject({key, expiresIn: 60 * 10});

        res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
        res.writeHead(302, {Location: url});
        res.end();
    },
});
