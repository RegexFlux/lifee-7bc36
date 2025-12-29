// pages/api/albums/[albumId]/exports.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, asc, desc, eq, inArray, sql} from "drizzle-orm";
import {z} from "zod";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db/index";
import {albumItems, albums, assets, exportJobItems, exportJobs, replicateGenerationJobs} from "@/lib/db/schema";
import {computeAlbumGenerationState} from "@/lib/exports/albumGenerationState";
import {enqueueExportJob} from "@/lib/aws/enqueueExportJob";
import {startPredictionForJob} from "@/lib/replicate/startPredictionForJob";
import {getDemoVersionId, getKlingVersionId} from "@/lib/replicate/index";
import {STSClient, GetCallerIdentityCommand} from "@aws-sdk/client-sts";


const ACTIVE_EXPORT = ["queued", "rendering", "waiting_generations"] as const;
const ACTIVE_REPL = ["queued", "starting", "processing"] as const;

const MAX_ITEMS = 120;
const MAX_ESTIMATED_DURATION_SEC = 9 * 60; // 9 minutes, marge lambda 15m

const zQuery = z.object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
});

function getAlbumId(req: NextApiRequest) {
    // ✅ Next pages router: [id] => req.query.id
    const v = Array.isArray(req.query.albumId) ? req.query.albumId[0] : req.query.albumId;
    return (v || "").trim() || null;
}

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const albumId = getAlbumId(req);
        if (!albumId) return fail(res, 400, "Missing album id");

        const q = zQuery.safeParse(req.query);
        if (!q.success) return fail(res, 400, "Invalid query", q.error.flatten());

        const a = (
            await db
                .select({id: albums.id})
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!a) return fail(res, 404, "Album not found");

        const rows = await db
            .select()
            .from(exportJobs)
            .where(and(eq(exportJobs.albumId, albumId), eq(exportJobs.userId, viewer.user.id)))
            .orderBy(desc(exportJobs.createdAt))
            .limit(q.data.limit);

        const genState = await computeAlbumGenerationState({albumId});

        return ok(res, {exports: rows, latest: rows[0] ?? null, generationState: genState});
    },

    POST: async (req: NextApiRequest, res: NextApiResponse) => {

        const sts = new STSClient({region: process.env.LIFEE_AWS_REGIONS});
        console.log("caller", await sts.send(new GetCallerIdentityCommand({})));


        const viewer = await requireViewer(req, res);
        const albumId = getAlbumId(req);
        if (!albumId) return fail(res, 400, "Missing album id");

        const a = (
            await db
                .select({id: albums.id})
                .from(albums)
                .where(and(eq(albums.id, albumId), eq(albums.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!a) return fail(res, 404, "Album not found");

        // ---- PRO gate (pseudo) ----
        const isPro = false;

        if (!isPro) {
            const existing = (
                await db
                    .select()
                    .from(exportJobs)
                    .where(and(eq(exportJobs.albumId, albumId), eq(exportJobs.userId, viewer.user.id), inArray(exportJobs.status, [...ACTIVE_EXPORT])))
                    .orderBy(desc(exportJobs.createdAt))
                    .limit(1)
            )[0];
            if (existing) return ok(res, {exportJob: existing, mode: "existing"});
        } else {
            const [{count}] = await db
                .select({count: sql<number>`COUNT(*)`})
                .from(exportJobs)
                .where(and(eq(exportJobs.userId, viewer.user.id), inArray(exportJobs.status, [...ACTIVE_EXPORT])));
            if (Number(count) >= 3) return fail(res, 429, "Too many concurrent exports (pro limit)");
        }

        // Récup items album (ordonnés)
        const albumRows = await db
            .select({
                albumItemId: albumItems.id,
                position: albumItems.position,
                assetId: assets.id,
                type: assets.type,
                asset: assets
            })
            .from(albumItems)
            .innerJoin(assets, eq(assets.id, albumItems.assetId))
            .where(eq(albumItems.albumId, albumId))
            .orderBy(asc(albumItems.position));

        if (!albumRows.length) return fail(res, 400, "Album has no items");

        if (albumRows.length > MAX_ITEMS) {
            return fail(res, 413, `Album too large (max ${MAX_ITEMS} items).`);
        }

        const IMAGE_SEC = 2.5;
        const DEFAULT_VIDEO_SEC = 5;
        const TRANSITION_SEC = 0.35;

        let estimated = 0;
        for (const r of albumRows) {
            estimated += (r.type === "image") ? IMAGE_SEC : DEFAULT_VIDEO_SEC;
        }
// transitions font un overlap (xfade) => durée finale approx = sum - t*(n-1)
        estimated = Math.max(0, estimated - TRANSITION_SEC * Math.max(0, albumRows.length - 1));

        if (estimated > MAX_ESTIMATED_DURATION_SEC) {
            return fail(res, 413, `Export too long (~${Math.round(estimated)}s). Reduce items or duration.`);
        }

        const model = isPro ? await getKlingVersionId() : await getDemoVersionId(); // tu as déjà ces helpers

        const {exportJob, createdGenJobIds, statusAfter} = await db.transaction(async (tx) => {
            const [created] = await tx
                .insert(exportJobs)
                .values({
                    albumId,
                    userId: viewer.user.id,
                    status: "waiting_generations",
                    progress: 0,
                })
                .returning();

            // 1) Snapshot export_job_items
            await tx.insert(exportJobItems).values(
                albumRows.map((r) => ({
                    exportJobId: created.id,
                    position: r.position,
                    albumItemId: r.albumItemId,
                    sourceAssetId: r.assetId,
                    resolvedAssetId: r.type === "video" ? r.assetId : null, // video = déjà "résolu"
                    type: r.type,
                }))
            );

            // 2) Créer replicate jobs pour les images (uniquement)
            const createdIds: string[] = [];

            for (const r of albumRows) {
                if (r.type !== "image") continue;

                // si déjà un job actif pour CET export + source asset, on ne recrée pas
                const existing = (await tx
                    .select({id: replicateGenerationJobs.id})
                    .from(replicateGenerationJobs)
                    .where(
                        and(
                            eq(replicateGenerationJobs.exportJobId, created.id),
                            eq(replicateGenerationJobs.createdByAssetId, r.assetId),
                            inArray(replicateGenerationJobs.status, [...ACTIVE_REPL]),
                            eq(replicateGenerationJobs.model, model)
                        )
                    )
                    .limit(1))[0];

                if (existing) continue;

                const [job] = await tx
                    .insert(replicateGenerationJobs)
                    .values({
                        userId: viewer.user.id,
                        exportJobId: created.id,
                        albumItemId: r.albumItemId,
                        createdByAssetId: r.assetId,
                        model,
                        status: "queued",
                        // month/year : récupère via assets si besoin (non présent dans select)
                        month: r.asset.month,
                        year: r.asset.year,
                    })
                    .returning({id: replicateGenerationJobs.id});

                createdIds.push(job.id);
            }

            const statusAfter = createdIds.length ? "waiting_generations" : "queued";

            await tx.update(exportJobs).set({
                status: statusAfter,
                updatedAt: new Date()
            }).where(eq(exportJobs.id, created.id));

            return {exportJob: created, createdGenJobIds: createdIds, statusAfter};
        });

        // 3) Déclencher réellement Replicate (hors transaction DB)
        for (const genId of createdGenJobIds) {
            await startPredictionForJob({generationId: genId, paid: isPro});
        }

        // 4) Push worker si ready
        if (statusAfter === "queued") {
            await enqueueExportJob(exportJob.id);
        }

        return ok(res, {exportJob, mode: "created", createdGenJobs: createdGenJobIds.length}, 201);
    },

    DELETE: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const albumId = getAlbumId(req);
        if (!albumId) return fail(res, 400, "Missing album id");

        // Cancel uniquement les exports actifs, pas les "done"
        const rows = await db
            .update(exportJobs)
            .set({status: "canceled"})
            .where(
                and(
                    eq(exportJobs.albumId, albumId),
                    eq(exportJobs.userId, viewer.user.id),
                    inArray(exportJobs.status, ["queued", "rendering", "waiting_generations"])
                )
            )
            .returning();

        return ok(res, {exports: rows, latest: rows[0] ?? null});
    },
});
