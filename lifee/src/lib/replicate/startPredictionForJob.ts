// src/lib/replicate/startPredictionForJob.ts
import {eq} from "drizzle-orm";
import {db} from "@/lib/db";
import {assets, replicateGenerationJobs} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/aws/s3/presignGet";
import {logReplicateJobEvent} from "@/lib/replicate/jobEvents";
import {
    buildBestPrompt,
    defaultNegativePrompt,
    getDemoVersionId,
    getKlingVersionId,
    getKlingInput,
    getWanInput,
} from "@/lib/replicate";

function webhookBase() {
    const base = process.env.PUBLIC_APP_URL;
    if (!base) throw new Error("Missing PUBLIC_APP_URL");
    return base.replace(/\/$/, "");
}

export async function startPredictionForJob(params: {
    generationId: string;
    paid: boolean;
    mode?: "standard" | "pro"
}) {
    const job = (await db.select().from(replicateGenerationJobs).where(eq(replicateGenerationJobs.id, params.generationId)).limit(1))[0];
    if (!job) throw new Error("Generation job not found");

    // idempotence
    if (job.replicatePredictionId || job.status === "starting" || job.status === "processing") return;

    const source = (await db.select().from(assets).where(eq(assets.id, job.createdByAssetId)).limit(1))[0];
    if (!source) throw new Error("Source asset not found");

    const startImageUrl = await presignGetObject({key: source.fileKey, expiresIn: 60 * 60 * 2});

    // ✅ prompt best result : default + assets.description (optionnel) + job.prompt (si déjà fixé)
    const prompt = buildBestPrompt({
        description: source.description ?? null,
        userPrompt: job.prompt ?? null, // si tu veux laisser une “direction” stockée
    });

    const negative = job.negativePrompt ?? defaultNegativePrompt();
    const duration = job.duration ?? 5;
    const aspectRatio = job.aspectRatio ?? "9:16";

    const versionId = params.paid ? await getKlingVersionId() : await getDemoVersionId();
    const input = params.paid
        ? getKlingInput({
            prompt,
            startImageUrl,
            duration,
            aspectRatio,
            negativePrompt: negative,
            mode: params.mode ?? "standard"
        })
        : getWanInput({prompt, startImageUrl, duration, aspectRatio, negativePrompt: negative});

    const webhookUrl = `${webhookBase()}/api/webhooks/replicate?generationId=${job.id}`;

    const rr = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            version: versionId,
            input,
            webhook: webhookUrl,
            webhook_events_filter: ["completed"],
        }),
    });

    const data = await rr.json().catch(() => ({}));

    if (!rr.ok) {
        await db.transaction(async (tx) => {
            await tx.update(replicateGenerationJobs).set({
                status: "failed",
                updatedAt: new Date()
            }).where(eq(replicateGenerationJobs.id, job.id));
            await logReplicateJobEvent(tx, {
                generationId: job.id,
                status: "error",
                source: "replicate",
                message: `Create failed: ${data?.detail || "unknown"}`,
            });
        });
        return;
    }

    const predictionId = data?.id as string | undefined;
    const st = (data?.status as string | undefined) || "starting";

    await db.transaction(async (tx) => {
        await tx.update(replicateGenerationJobs).set({
            replicatePredictionId: predictionId ?? null,
            status: st === "processing" ? "processing" : "starting",
            updatedAt: new Date(),
            // optionnel: stocker ce que tu as réellement envoyé
            prompt,
            negativePrompt: negative,
            duration,
            aspectRatio,
        }).where(eq(replicateGenerationJobs.id, job.id));

        await logReplicateJobEvent(tx, {
            generationId: job.id,
            status: "info",
            source: "replicate",
            message: `Prediction created (${predictionId ?? "no-id"}) status=${st}`,
        });
    });
}
