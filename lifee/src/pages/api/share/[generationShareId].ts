// File: pages/api/share/[generationShareId].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, isNull, sql} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db/index";
import {assets, generationShares, replicateGenerationJobs} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";
import {LifeeJobStatus} from "@/types/interactiveDemo";
import {match} from "ts-pattern";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const generationShareId = Array.isArray(req.query.generationShareId) ? req.query.generationShareId[0] : req.query.generationShareId;
        if (!generationShareId) return fail(res, 400, "Missing generationShareId");

        const share = (
            await db
                .select()
                .from(generationShares)
                .where(and(eq(generationShares.id, generationShareId), eq(generationShares.isActive, true)))
                .limit(1)
        )[0];

        if (!share) return fail(res, 404, "Not found");

        const job = (
            await db
                .select()
                .from(replicateGenerationJobs)
                .where(eq(replicateGenerationJobs.id, share.generationJobId))
                .limit(1)
        )[0];

        if (!job) return fail(res, 404, "Not found");

        const source = (
            await db
                .select()
                .from(assets)
                .where(and(eq(assets.id, job.createdByAssetId), isNull(assets.deletedAt)))
                .limit(1)
        )[0];

        if (!source) return fail(res, 404, "Not found");

        const {preResponse, statusLine} = match(job.status)
            .with('starting', () => ({
                statusLine: 'Démarré',
                preResponse: true
            }))
            .with('uploading', () => ({
                statusLine: 'En cours de chargement',
                preResponse: true
            }))
            .with('queued', () => ({
                statusLine: 'Dans la file d\'attente',
                preResponse: true
            }))
            .with('processing', () => ({
                statusLine: 'En cours de traitement',
                preResponse: true
            }))
            .with('canceled', () => ({
                statusLine: 'Annulé',
                preResponse: true
            }))
            .with('failed', () => ({
                statusLine: 'Echec',
                preResponse: true
            }))
            .with('succeeded', () => ({
                statusLine: 'Prêt',
                preResponse: false
            })).exhaustive();

        const createdLabel =
            job.month && job.year
                ? `Souvenir • ${String(job.month).padStart(2, "0")}/${job.year}`
                : job.createdAt
                    ? `Créé le ${new Intl.DateTimeFormat("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    }).format(new Date(job.createdAt as any))}`
                    : "Créé récemment";

        const expiresInSec = 60 * 15;
        const thumbnailUrl: string = await presignGetObject({key: source.fileKey, expiresIn: expiresInSec})

        if (preResponse) {
            return ok(res, {
                status: job.status,
                progress: job.progress,
                statusLine,
                title: source.title,
                createdLabel,
                createdBy: 'un proche',
                thumbnailUrl,
                shareUrl: `/share/${share.id}`
            });
        }

        const result = (
            await db
                .select()
                .from(assets)
                .where(and(eq(assets.id, job.resultAssetId), isNull(assets.deletedAt)))
                .limit(1)
        )[0];

        if (!result) return fail(res, 404, "Not found");

        const resultUrl = await presignGetObject({key: result.fileKey, expiresIn: expiresInSec});

        if (!result) return fail(res, 404, "Not found");

        // stats (best-effort)
        await db.execute(sql`
            UPDATE "generation_shares"
            SET "access_count"     = "access_count" + 1,
                "last_accessed_at" = now()
            WHERE "id" = ${generationShareId}
        `);

        return ok(res, {
            status: job.status,
            progress: job.progress,
            statusLine,
            title: source.title,
            createdLabel,
            createdBy: 'un proche',
            thumbnailUrl,
            resultUrl,
            shareUrl: `/share/${share.id}`
        });
    },
});
