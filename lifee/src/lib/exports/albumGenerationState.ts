// src/lib/exports/albumGenerationState.ts
import {and, eq, inArray, sql} from "drizzle-orm";
import {db} from "@/lib/db";
import {albumItems, assets, replicateGenerationJobs} from "@/lib/db/schema";

export const ACTIVE_REPLICATE_STATUSES = ["queued", "starting", "processing"] as const;
export const FAIL_REPLICATE_STATUSES = ["failed", "canceled"] as const;

/**
 * Un job Replicate est "bloquant" s'il concerne l'item courant :
 * - replicate.albumItemId = albumItems.id
 * - replicate.createdByAssetId = albumItems.assetId (donc l'item n'a pas changé depuis)
 * - status actif
 */
export async function computeAlbumGenerationState(params: { albumId: string }) {
    const {albumId} = params;

    const [row] = await db
        .select({
            pending: sql<number>`COUNT(*) FILTER (WHERE
            ${inArray(replicateGenerationJobs.status, [...ACTIVE_REPLICATE_STATUSES])}
            )`,
            failed: sql<number>`COUNT(*) FILTER (WHERE
            ${inArray(replicateGenerationJobs.status, [...FAIL_REPLICATE_STATUSES])}
            )`,
        })
        .from(albumItems)
        .innerJoin(replicateGenerationJobs, eq(replicateGenerationJobs.albumItemId, albumItems.id))
        .where(
            and(
                eq(albumItems.albumId, albumId),
                // job toujours pertinent = item pointe encore vers l'asset source
                eq(replicateGenerationJobs.createdByAssetId, albumItems.assetId)
            )
        );

    return {
        pending: Number(row?.pending ?? 0),
        failed: Number(row?.failed ?? 0),
        ready: Number(row?.pending ?? 0) === 0 && Number(row?.failed ?? 0) === 0,
    };
}

/**
 * Retourne les items (avec type) pour décider quoi générer.
 */
export async function listAlbumItemsForExportGeneration(params: { albumId: string }) {
    const {albumId} = params;
    return db
        .select({
            albumItemId: albumItems.id,
            assetId: assets.id,
            type: assets.type,
            month: assets.month,
            year: assets.year,
            userId: assets.userId,
            title: assets.title,
        })
        .from(albumItems)
        .innerJoin(assets, eq(assets.id, albumItems.assetId))
        .where(eq(albumItems.albumId, albumId));
}
