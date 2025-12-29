// pages/api/generations/[id].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, asc, eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {assets, replicateGenerationJobEvents, replicateGenerationJobs} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/aws/s3/presignGet";
import {z} from 'zod';
import {syncReplicatePredictionIfNeeded} from "@/lib/replicate/syncPrediction";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!id) return fail(res, 400, "Missing id");

        const q = z
            .object({limit: z.coerce.number().int().min(1).max(200).default(80)})
            .safeParse(req.query);
        if (!q.success) return fail(res, 400, "Invalid query", q.error.flatten());

        const checkJob = (
            await db
                .select()
                .from(replicateGenerationJobs)
                .where(and(eq(replicateGenerationJobs.id, id), eq(replicateGenerationJobs.userId, viewer.user.id)))
                .limit(1)
        )[0];

        if (!checkJob) return fail(res, 404, "Not found");


// Fallback sync (throttlé)
        await syncReplicatePredictionIfNeeded({
            generationId: id,
            userId: viewer.user.id,
        });

// Re-fetch job après sync (optionnel mais conseillé)
        const job = (
            await db
                .select()
                .from(replicateGenerationJobs)
                .where(and(eq(replicateGenerationJobs.id, id), eq(replicateGenerationJobs.userId, viewer.user.id)))
                .limit(1)
        )[0];


        const expiresInSec = 60 * 15;

        let resultUrl: string | null = null;
        let thumbnailUrl: string | null = null;

        if (job.resultAssetId) {
            const result = (await db.select().from(assets).where(eq(assets.id, job.resultAssetId)).limit(1))[0];
            if (result) {
                resultUrl = await presignGetObject({key: result.fileKey, expiresIn: expiresInSec});

                // fallback thumbnail:
                // 1) result.thumbnailKey
                // 2) sinon image source (createdByAssetId) si c’est une image
                if (result.thumbnailKey) {
                    thumbnailUrl = await presignGetObject({key: result.thumbnailKey, expiresIn: expiresInSec});
                } else {
                    const source = (await db.select().from(assets).where(eq(assets.id, job.createdByAssetId)).limit(1))[0];
                    if (source?.type === "image") {
                        thumbnailUrl = await presignGetObject({key: source.fileKey, expiresIn: expiresInSec});
                    }
                }
            }
        }

        const events = await db
            .select()
            .from(replicateGenerationJobEvents)
            .where(eq(replicateGenerationJobEvents.replicateGenerationJobId, id))
            .orderBy(asc(replicateGenerationJobEvents.createdAt))
            .limit(q.data.limit);

        return ok(res, {
            job,
            signed: {resultUrl, thumbnailUrl, expiresInSec},
            events
        });
    },
});
