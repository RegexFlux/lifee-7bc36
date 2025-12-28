// src/lib/exports/tryReleaseExports.ts
import {and, eq} from "drizzle-orm";
import {db} from "@/lib/db";
import {exportJobs} from "@/lib/db/schema";
import {computeAlbumGenerationState} from "./albumGenerationState";

export async function tryReleaseExportsForAlbum(params: { albumId: string }) {
    const {albumId} = params;

    const state = await computeAlbumGenerationState({albumId});
    if (!state.ready) return {released: 0, state};

    const updated = await db
        .update(exportJobs)
        .set({status: "queued", updatedAt: new Date()})
        .where(and(eq(exportJobs.albumId, albumId), eq(exportJobs.status, "waiting_generations")))
        .returning({id: exportJobs.id});

    return {released: updated.length, state};
}
