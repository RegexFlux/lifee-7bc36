// pages/api/albums/[id]/exports.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, desc, eq, inArray, not, sql} from "drizzle-orm";
import {z} from "zod";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db/index";
import {albums, exportJobs} from "@/lib/db/schema";
import {computeAlbumGenerationState} from "@/lib/exports/albumGenerationState";
import {ensureReplicateJobsForExport} from "@/lib/exports/ensureReplicateJobsForExport";
import {notEqual} from "assert";

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
        // Remplace par ton champ réel (viewer.user.plan / subscription / credits...)
        // const isPro = (viewer.user as any)?.plan === "pro";
        const isPro = false;
        // 1) Idempotence: export actif existant (par album)
        // Non-pro: 1 export actif par album
        // Pro: autorise plusieurs (mais garde une limite globale raisonnable)
        const activeStatuses = ["queued", "rendering", "waiting_generations"] as const;

        if (!isPro) {
            const albumRunningExport = (
                await db
                    .select()
                    .from(exportJobs)
                    .where(
                        and(
                            eq(exportJobs.albumId, albumId),
                            eq(exportJobs.userId, viewer.user.id),
                            not(eq(exportJobs.status, "canceled"))
                        )
                    )
                    .orderBy(desc(exportJobs.createdAt))
                    .limit(1)
            )[0];

            if (albumRunningExport) return ok(res, {exportJob: albumRunningExport, mode: "existing"});

            // Max 1 export actif par user (optionnel mais utile contre l'abus)
            const userRunning = (
                await db
                    .select()
                    .from(exportJobs)
                    .where(and(eq(exportJobs.userId, viewer.user.id), inArray(exportJobs.status, [...activeStatuses])))
                    .orderBy(desc(exportJobs.createdAt))
                    .limit(1)
            )[0];
            if (userRunning) return ok(res, {exportJob: userRunning, mode: "existing"});
        } else {
            // PRO: limite soft (ex: max 3 exports actifs simultanés)
            const [{count}] = await db
                .select({count: sql<number>`COUNT(*)`})
                .from(exportJobs)
                .where(and(eq(exportJobs.userId, viewer.user.id), inArray(exportJobs.status, [...activeStatuses])));
            if (Number(count) >= 3) {
                return fail(res, 429, "Too many concurrent exports (pro limit)");
            }
        }

        // 2) Au moment de la demande d'export => créer/assurer les jobs Replicate
        const model = "kwaivgi/kling-v2.5-turbo-pro"; // <-- mets ton modèle par défaut
        await ensureReplicateJobsForExport({albumId, userId: viewer.user.id, model});

        // 3) Calcul readiness
        const genState = await computeAlbumGenerationState({albumId});

        const [created] = await db
            .insert(exportJobs)
            .values({
                albumId,
                userId: viewer.user.id,
                status: genState.ready ? "queued" : "waiting_generations",
                progress: 0,
            })
            .returning();

        return ok(res, {exportJob: created, mode: "created", generationState: genState}, 201);
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
