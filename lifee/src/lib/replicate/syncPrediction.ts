import {and, eq, isNull, lt, sql} from "drizzle-orm";
import {db} from "@/lib/db";
import {assets, replicateGenerationJobs} from "@/lib/db/schema";
import {logReplicateJobEvent} from "@/lib/replicate/jobEvents";
import type {ReplicateJobStatus} from "@/lib/db/types";
import {putRemoteUrlToS3} from "@/lib/aws/s3/putRemoteUrlToS3";

/**
 * Poll soft: pas plus d'une fois toutes les N ms, et "claim" DB pour éviter les doublons.
 */
const SYNC_MIN_INTERVAL_MS = 30_000;

const NON_TERMINAL: readonly ReplicateJobStatus[] = ["queued", "starting", "processing", "finalizing"];
const TERMINAL: readonly ReplicateJobStatus[] = ["succeeded", "failed", "canceled"];

function pickOutputUrl(output: any): string | null {
    if (!output) return null;
    if (typeof output === "string") return output;
    if (Array.isArray(output)) return typeof output[0] === "string" ? output[0] : null;
    return null;
}

function coerceStatus(s: any): ReplicateJobStatus | null {
    if (s === "starting") return "starting";
    if (s === "processing") return "processing";
    if (s === "succeeded") return "succeeded";
    if (s === "failed") return "failed";
    if (s === "canceled") return "canceled";
    if (s === "queued") return "queued";
    return null;
}

async function fetchReplicatePrediction(predictionId: string) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error("Missing REPLICATE_API_TOKEN");

    const r = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(predictionId)}`, {
        headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
        },
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
        const msg = typeof data?.detail === "string" ? data.detail : (data?.error || r.statusText);
        throw new Error(`Replicate get prediction failed: ${msg}`);
    }
    return data;
}

/**
 * Finalisation commune (même esprit que ton webhook) : upload S3 + insert asset + update job.
 * IMPORTANT: reste idempotent grâce à la clé stable + check job.resultAssetId.
 */
async function finalizeSucceededJob(params: {
    generationId: string;
    outputUrl: string;
}) {
    const {generationId, outputUrl} = params;

    // re-fetch job
    const fresh = (await db.select().from(replicateGenerationJobs).where(eq(replicateGenerationJobs.id, generationId)).limit(1))[0];
    if (!fresh) return;

    if (fresh.status === "succeeded" && fresh.resultAssetId) return;

    // source asset
    const source = (await db.select().from(assets).where(eq(assets.id, fresh.createdByAssetId)).limit(1))[0];
    if (!source) {
        await db.transaction(async (tx) => {
            await tx.update(replicateGenerationJobs).set({
                status: "failed",
                updatedAt: new Date()
            }).where(eq(replicateGenerationJobs.id, generationId));
            await logReplicateJobEvent(tx, {
                generationId,
                status: "error",
                source: "server",
                message: "Missing source asset (during fallback sync)",
            });
        });
        return;
    }

    // upload (key stable => idempotent côté S3)
    const videoKey = `lifee/users/${source.userId}/assets/video/${generationId}.mp4`;
    await putRemoteUrlToS3({key: videoKey, url: outputUrl, contentType: "video/mp4"});

    await db.transaction(async (tx) => {
        const again = (await tx.select().from(replicateGenerationJobs).where(eq(replicateGenerationJobs.id, generationId)).limit(1))[0];
        if (!again) return;
        if (again.status === "succeeded" && again.resultAssetId) return;

        const [videoAsset] = await tx
            .insert(assets)
            .values({
                userId: source.userId,
                type: "video",
                fileKey: videoKey,
                title: source.title,
                month: source.month,
                year: source.year,
                generatedFromAssetId: source.id,
            })
            .returning();

        await tx.update(replicateGenerationJobs).set({
            status: "succeeded",
            resultAssetId: videoAsset.id,
            updatedAt: new Date(),
        }).where(eq(replicateGenerationJobs.id, generationId));

        await logReplicateJobEvent(tx, {
            generationId,
            status: "success",
            source: "server",
            message: `Fallback sync finalized: Video saved to S3 (assetId=${videoAsset.id})`,
        });
    });
}

export async function syncReplicatePredictionIfNeeded(params: {
    generationId: string;
    userId: string; // pour re-check sécurité si tu veux re-fetch le job ici
}) {
    const {generationId, userId} = params;

    const job = (
        await db
            .select()
            .from(replicateGenerationJobs)
            .where(and(eq(replicateGenerationJobs.id, generationId), eq(replicateGenerationJobs.userId, userId)))
            .limit(1)
    )[0];

    if (!job) return {didSync: false};

    // Rien à faire si terminal + finalisé
    if (TERMINAL.includes(job.status) && job.status !== "succeeded") return {didSync: false};
    if (job.status === "succeeded" && job.resultAssetId) return {didSync: false};

    // Sans predictionId => impossible de poll
    const predictionId = job.replicatePredictionId;
    if (!predictionId) return {didSync: false};

    // Seulement si non-terminal (ou succeeded mais pas finalisé, typiquement "finalizing")
    if (!NON_TERMINAL.includes(job.status) && job.status !== "succeeded") return {didSync: false};

    const now = new Date();
    const cutoff = new Date(now.getTime() - SYNC_MIN_INTERVAL_MS);

    // Claim atomique: si replicateCheckedAt récent, on ne fait rien
    const claimed = await db
        .update(replicateGenerationJobs)
        .set({replicateCheckedAt: now})
        .where(
            and(
                eq(replicateGenerationJobs.id, generationId),
                eq(replicateGenerationJobs.userId, userId),
                // claim si NULL ou trop vieux
                sql`(${replicateGenerationJobs.replicateCheckedAt} IS NULL OR ${replicateGenerationJobs.replicateCheckedAt} < ${cutoff})`
            )
        )
        .returning({id: replicateGenerationJobs.id});

    if (!claimed.length) return {didSync: false}; // un autre appel a déjà sync récemment

    // Fetch replicate
    let pred: any;
    try {
        pred = await fetchReplicatePrediction(predictionId);
    } catch (e: any) {
        await db.transaction(async (tx) => {
            await logReplicateJobEvent(tx, {
                generationId,
                status: "warn",
                source: "replicate",
                message: `Fallback sync poll failed: ${e?.message || "?"}`,
            });
        });
        return {didSync: true}; // on a “essayé”
    }

    const nextStatus = coerceStatus(pred?.status) ?? job.status;
    const err = pred?.error ? String(pred.error) : null;

    // Update status + event (comme webhook)
    const writeStatus = nextStatus === "succeeded" ? "finalizing" : nextStatus;

    await db.transaction(async (tx) => {
        await tx.update(replicateGenerationJobs).set({
            status: writeStatus,
            updatedAt: new Date(),
        }).where(eq(replicateGenerationJobs.id, generationId));

        await logReplicateJobEvent(tx, {
            generationId,
            status: err ? "warn" : (nextStatus === "succeeded" ? "success" : "info"),
            source: "replicate",
            message: err ? `Fallback sync: Status=${nextStatus} error=${err}` : `Fallback sync: Status=${nextStatus}`,
        });
    });

    // Si pas succeeded => fini
    if (nextStatus !== "succeeded") return {didSync: true};

    // Succeeded => finalise si output dispo
    const outUrl = pickOutputUrl(pred?.output);
    if (!outUrl) {
        await db.transaction(async (tx) => {
            await tx.update(replicateGenerationJobs).set({
                status: "failed",
                updatedAt: new Date()
            }).where(eq(replicateGenerationJobs.id, generationId));
            await logReplicateJobEvent(tx, {
                generationId,
                status: "error",
                source: "replicate",
                message: "Fallback sync: Missing output URL",
            });
        });
        return {didSync: true};
    }

    await finalizeSucceededJob({generationId, outputUrl: outUrl});
    return {didSync: true};
}
