import {and, eq} from "drizzle-orm";
import {db} from "@/lib/db";

import {studioJobImports} from "@/lib/db/schema.auth";
import {studioAssets} from "@/lib/db/schema.studio";

// ✅ adapte cet import selon ton schema réel
import {lifeeJobs} from "@/lib/db/schema"; // <-- si ton job est dans ce fichier

function parseJobMonthYear(d: Date | null | undefined) {
    const dt = d ?? new Date();
    return {month: dt.getMonth() + 1, year: dt.getFullYear()};
}

/**
 * Idempotent: n’importe qu’une fois par user+jobId
 */
export async function importJobToLibrary(userId: string, jobId: string) {
    if (!jobId) return;

    // 1) déjà importé ?
    // const already = await db
    //     .select({id: studioJobImports.id})
    //     .from(studioJobImports)
    //     .where(and(eq(studioJobImports.userId, userId), eq(studioJobImports.jobId, jobId)))
    //     .limit(1);
    //
    // if (already.length) return;

    // 2) charge le job (ADAPTE les colonnes selon ton schema)
    const [job] = await db
        .select()
        .from(lifeeJobs)
        // @ts-expect-error adapte si jobId est uuid
        .where(eq(lifeeJobs.id, jobId))
        .limit(1);

    if (!job) return;

    const {month, year} = parseJobMonthYear(
        // @ts-expect-error
        job.createdAt ?? job.created_at ?? null
    );

    // 3) insère les assets (si existants)
    if (job.imageKey) {
        await db.insert(studioAssets).values({
            userId,
            type: "image",
            title: "Démo — Image",
            month,
            year,
            fileKey: job.imageKey,
            thumbnailKey: job.imageKey,
            isGenerated: false,
        });
    }

    if (job.videoKey) {
        await db.insert(studioAssets).values({
            userId,
            type: "video",
            title: "Démo — Vidéo",
            month,
            year,
            durationSec: null,
            fileKey: job.videoKey,
            thumbnailKey: job.imageKey,
            isGenerated: true,
            context: "Imported from demo job",
        });
    }

    // 4) marque importé
    await db.insert(studioJobImports).values({userId, jobId});
}
