// src/lib/replicate/startReplicatePredictionForJob.ts
import {eq, and, sql} from "drizzle-orm";
import {db} from "@/lib/db";
import {assets, replicateGenerationJobs} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";
import {resolveReplicateVersion} from "@/lib/replicate/resolveVersion";
import {logReplicateJobEvent} from "@/lib/replicate/jobEvents";
import {getKlingInput, getWanInput} from "@/lib/replicate/index";

function getWebhookBaseUrl() {
    // IMPORTANT: une URL publique stable (plus de localtunnel)
    // ex: https://app.tondomaine.com
    const base = process.env.PUBLIC_APP_URL;
    if (!base) throw new Error("Missing PUBLIC_APP_URL");
    return base.replace(/\/$/, "");
}

export async function startReplicatePredictionForJob(params: { generationId: string; paid: boolean }) {
    const job = (await db.select().from(replicateGenerationJobs).where(eq(replicateGenerationJobs.id, params.generationId)).limit(1))[0];
    if (!job) throw new Error("Generation job not found");

    // Idempotence : déjà démarré ?
    if (job.replicatePredictionId || job.status === "starting" || job.status === "processing") return;

    const source = (await db.select().from(assets).where(eq(assets.id, job.createdByAssetId)).limit(1))[0];
    if (!source) throw new Error("Source asset not found");
    if (source.type !== "image") throw new Error("startReplicatePredictionForJob expects image source");

    const startImageUrl = await presignGetObject({key: source.fileKey, expiresIn: 60 * 60 * 2});

    // ⚠️ À toi de décider où viennent prompt/aspectRatio/negativePrompt
    // Option simple : valeurs par défaut export
    const prompt = "cinematic, smooth camera, natural light";
    const negativePrompt = "blurry, distorted, low quality";
    const aspectRatio = "9:16";
    const durationSec = 5;

    const model = job.model; // déjà stocké sur le job au moment de l’export
    const input = params.paid
        ? getKlingInput(prompt, startImageUrl, durationSec, aspectRatio, negativePrompt)
        : getWanInput(prompt, startImageUrl, durationSec, aspectRatio, negativePrompt);

    const version = await resolveReplicateVersion(model);

    const webhookUrl = `${getWebhookBaseUrl()}/api/webhooks/replicate?generationId=${job.id}`;

    const body = {
        version,
        input,
        webhook: webhookUrl,
        webhook_events_filter: ["completed"],
    };

    const rr = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
    const status = (data?.status as string | undefined) || "starting";

    await db.transaction(async (tx) => {
        await tx.update(replicateGenerationJobs).set({
            replicatePredictionId: predictionId ?? null,
            status: status === "processing" ? "processing" : "starting",
            updatedAt: new Date(),
        }).where(eq(replicateGenerationJobs.id, job.id));

        await logReplicateJobEvent(tx, {
            generationId: job.id,
            status: "info",
            source: "replicate",
            message: `Prediction created (${predictionId ?? "no-id"}) status=${status}`,
        });
    });
}
