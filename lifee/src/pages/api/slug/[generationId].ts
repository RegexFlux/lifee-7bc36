// pages/api/slug/[generationId].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {eq} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {replicateGenerationJobs, assets} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const generationId = Array.isArray(req.query.generationId) ? req.query.generationId[0] : req.query.generationId;
        if (!generationId) return fail(res, 400, "Missing generationId");

        const job = (
            await db.select().from(replicateGenerationJobs).where(eq(replicateGenerationJobs.id, generationId)).limit(1)
        )[0];
        if (!job) return fail(res, 404, "Not found");

        if (!job.resultAssetId) return fail(res, 404, "Not ready");

        const result = (await db.select().from(assets).where(eq(assets.id, job.resultAssetId)).limit(1))[0];
        if (!result) return fail(res, 404, "Result missing");

        const source = (await db.select().from(assets).where(eq(assets.id, job.createdByAssetId)).limit(1))[0];

        const resultUrl = await presignGetObject({key: result.fileKey, expiresIn: 60 * 15});

        // thumbnail fallback:
        // 1) si result.thumbnailKey existe -> poster
        // 2) sinon -> source image si dispo
        const thumbKey =
            result.thumbnailKey ||
            (source?.type === "image" ? source.fileKey : null);

        const thumbnailUrl = thumbKey ? await presignGetObject({key: thumbKey, expiresIn: 60 * 15}) : null;

        return ok(res, {thumbnailUrl, resultUrl, expiresInSec: 60 * 15});
    },
});
