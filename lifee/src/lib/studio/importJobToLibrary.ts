import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";

import { studioJobImports } from "@/lib/db/schema.auth";
import { studioAssets } from "@/lib/db/schema.studio";

// ✅ adapte cet import selon ton schema réel
import { lifeeJobs } from "@/lib/db/schema"; // <-- si ton job est dans ce fichier

function parseJobMonthYear(d: Date | null | undefined) {
    const dt = d ?? new Date();
    return { month: dt.getMonth() + 1, year: dt.getFullYear() };
}

/**
 * Idempotent: n’importe qu’une fois par user+jobId
 */
export async function importJobToLibrary(userId: string, jobId: string) {
    if (!jobId) return;

    // 1) déjà importé ?
    const already = await db
        .select({ id: studioJobImports.id })
        .from(studioJobImports)
        .where(and(eq(studioJobImports.userId, userId), eq(studioJobImports.jobId, jobId)))
        .limit(1);

    if (already.length) return;

    // 2) charge le job (ADAPTE les colonnes selon ton schema)
    const [job] = await db
        .select()
        .from(lifeeJobs)
        // @ts-expect-error adapte si jobId est uuid
        .where(eq(lifeeJobs.id, jobId))
        .limit(1);

    if (!job) return;

    // ⚠️ ADAPTE ces champs:
    const imageUrl: string | null =
        // @ts-expect-error
        job.imageUrl ?? job.photoUrl ?? job.inputImageUrl ?? null;

    const videoUrl: string | null =
        // @ts-expect-error
        job.videoUrl ?? job.outputVideoUrl ?? job.resultVideoUrl ?? null;

    const thumbUrl: string | null =
        // @ts-expect-error
        job.thumbnailUrl ?? job.thumbUrl ?? null;

    const { month, year } = parseJobMonthYear(
        // @ts-expect-error
        job.createdAt ?? job.created_at ?? null
    );

    // 3) insère les assets (si existants)
    if (imageUrl) {
        await db.insert(studioAssets).values({
            userId,
            type: "image",
            title: "Démo — Image",
            month,
            year,
            fileUrl: imageUrl,
            thumbnailUrl: thumbUrl ?? imageUrl,
            isGenerated: false,
        });
    }

    if (videoUrl) {
        await db.insert(studioAssets).values({
            userId,
            type: "video",
            title: "Démo — Vidéo",
            month,
            year,
            durationSec: null,
            fileUrl: videoUrl,
            thumbnailUrl: thumbUrl ?? null,
            isGenerated: true,
            context: "Imported from demo job",
        });
    }

    // 4) marque importé
    await db.insert(studioJobImports).values({ userId, jobId });
}
