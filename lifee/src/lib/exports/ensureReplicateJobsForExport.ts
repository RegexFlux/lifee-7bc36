// src/lib/exports/ensureReplicateJobsForExport.ts
import {and, eq, inArray} from "drizzle-orm";
import {db} from "@/lib/db";
import {replicateGenerationJobs} from "@/lib/db/schema";
import {listAlbumItemsForExportGeneration, ACTIVE_REPLICATE_STATUSES} from "./albumGenerationState";

/**
 * IMPORTANT : on crée les rows DB d'abord, puis on déclenche Replicate ensuite.
 * (évite les appels réseau dans une transaction DB)
 */
export async function ensureReplicateJobsForExport(params: {
    albumId: string;
    userId: string;
    model: string; // ex: "kwaivgi/kling-v2.5-turbo-pro"
}) {
    const {albumId, userId, model} = params;

    const items = await listAlbumItemsForExportGeneration({albumId});

    // Exemple : on génère seulement pour les images.
    // (si tu veux aussi regénérer certaines vidéos, change ici)
    const targets = items.filter((it) => it.type === "image");

    const createdJobIds: string[] = [];
    const reusedJobIds: string[] = [];

    for (const it of targets) {
        // Déjà un job actif pertinent ?
        const existing = (await db
            .select()
            .from(replicateGenerationJobs)
            .where(
                and(
                    eq(replicateGenerationJobs.albumItemId, it.albumItemId),
                    eq(replicateGenerationJobs.createdByAssetId, it.assetId),
                    eq(replicateGenerationJobs.model, model),
                    inArray(replicateGenerationJobs.status, [...ACTIVE_REPLICATE_STATUSES])
                )
            )
            .limit(1))[0];

        if (existing) {
            reusedJobIds.push(existing.id);
            continue;
        }

        // Déjà finalisé ? (job succeeded + resultAssetId)
        const done = (await db
            .select({id: replicateGenerationJobs.id})
            .from(replicateGenerationJobs)
            .where(
                and(
                    eq(replicateGenerationJobs.albumItemId, it.albumItemId),
                    eq(replicateGenerationJobs.createdByAssetId, it.assetId),
                    eq(replicateGenerationJobs.model, model),
                    eq(replicateGenerationJobs.status, "succeeded")
                )
            )
            .limit(1))[0];
        if (done) continue;

        const [job] = await db
            .insert(replicateGenerationJobs)
            .values({
                userId,
                albumItemId: it.albumItemId,
                createdByAssetId: it.assetId,
                model,
                status: "queued",
                progress: 0,
                month: it.month,
                year: it.year,
            })
            .returning({id: replicateGenerationJobs.id});

        createdJobIds.push(job.id);
    }

    // Déclencher Replicate maintenant (hors transaction DB)
    // Tu dois implémenter ce morceau avec ton client Replicate.
    for (const jobId of createdJobIds) {
        await startReplicatePredictionForJob({generationId: jobId});
    }

    return {
        created: createdJobIds.length,
        reused: reusedJobIds.length,
        totalTargets: targets.length,
    };
}

/**
 * PLACEHOLDER : à remplacer avec ton code existant "create prediction".
 * Doit :
 * - appeler Replicate
 * - passer webhook URL = /api/webhooks/replicate?generationId=...
 * - update replicateGenerationJobs.replicatePredictionId + status="starting"
 */
async function startReplicatePredictionForJob(_params: { generationId: string }) {
    // TODO: intégrer ton code
}
