// File: pages/api/public/generations/[generationId].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, isNull, sql} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {assets, generationShares, replicateGenerationJobs} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const generationId = Array.isArray(req.query.generationId) ? req.query.generationId[0] : req.query.generationId;
        if (!generationId) return fail(res, 400, "Missing generationId");

        const share = (
            await db
                .select()
                .from(generationShares)
                .where(and(eq(generationShares.generationJobId, generationId), eq(generationShares.isActive, true)))
                .limit(1)
        )[0];

        if (!share) return fail(res, 404, "Not found");

        const job = (
            await db
                .select({
                    id: replicateGenerationJobs.id,
                    status: replicateGenerationJobs.status,
                    createdByAssetId: replicateGenerationJobs.createdByAssetId,
                    resultAssetId: replicateGenerationJobs.resultAssetId,
                })
                .from(replicateGenerationJobs)
                .where(eq(replicateGenerationJobs.id, generationId))
                .limit(1)
        )[0];

        if (!job) return fail(res, 404, "Not found");
        if (job.status !== "succeeded" || !job.resultAssetId) return fail(res, 409, "Not ready");

        const result = (
            await db
                .select({
                    id: assets.id,
                    type: assets.type,
                    fileKey: assets.fileKey,
                    thumbnailKey: assets.thumbnailKey,
                    deletedAt: assets.deletedAt,
                })
                .from(assets)
                .where(and(eq(assets.id, job.resultAssetId), isNull(assets.deletedAt)))
                .limit(1)
        )[0];

        if (!result) return fail(res, 404, "Not found");

        const expiresInSec = 60 * 15;
        const resultUrl = await presignGetObject({key: result.fileKey, expiresIn: expiresInSec});

        // thumbnail: priorité thumbnailKey sinon fallback sur asset source (image)
        let thumbnailUrl: string | null = null;

        if (result.thumbnailKey) {
            thumbnailUrl = await presignGetObject({key: result.thumbnailKey, expiresIn: expiresInSec});
        } else {
            const source = (
                await db
                    .select({fileKey: assets.fileKey, type: assets.type})
                    .from(assets)
                    .where(and(eq(assets.id, job.createdByAssetId), isNull(assets.deletedAt)))
                    .limit(1)
            )[0];

            if (source?.type === "image") {
                thumbnailUrl = await presignGetObject({key: source.fileKey, expiresIn: expiresInSec});
            }
        }

        // stats (best-effort)
        await db.execute(sql`
            UPDATE "generation_shares"
            SET "access_count"     = "access_count" + 1,
                "last_accessed_at" = now()
            WHERE "generation_job_id" = ${generationId}
        `);

        return ok(res, {thumbnailUrl, resultUrl, expiresInSec});
    },
});
