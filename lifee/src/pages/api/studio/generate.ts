// pages/api/studio/generate.ts
import type {NextApiRequest, NextApiResponse} from "next";
import crypto from "node:crypto";
import {and, eq, sql} from "drizzle-orm";

import {db} from "@/lib/db";
import {requireUserId} from "@/pages/api/studio/_auth";
import {appUsers} from "@/lib/db/schema.auth";
import {studioAssets} from "@/lib/db/schema.studio";
import {lifeeJobs, lifeeJobEvents} from "@/lib/db/schema";

import {replicate, getLatestVersionId} from "@/lib/replicate/replicateClient";
import {presignGet} from "@/lib/s3";
import {nanoid} from "nanoid";
import process from "node:process";
import {createPredictionLive} from "@/lib/replicate/provider";

function toMMYYYY(month: number, year: number) {
    return `${String(month).padStart(2, "0")}/${year}`;
}


function getAppUrlFromReq(req: NextApiRequest) {
    const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
    return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;


    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as {
        sourceAssetId: string;
        durationSec: number;
        prompt: string;
        aspectRatio?: "16:9" | "9:16" | "1:1";
        negativePrompt?: string;
    };

    // TODO
    console.log(body);
    body.prompt = "prompt test"

    if (!body?.sourceAssetId || !body?.prompt || !body?.durationSec) {
        return res.status(400).send("Missing fields");
    }

    const [user] = await db.select({credits: appUsers.credits}).from(appUsers).where(eq(appUsers.id, userId));
    if ((user?.credits ?? 0) <= 0) return res.status(402).send("No credits");

    const [source] = await db
        .select()
        .from(studioAssets)
        .where(and(eq(studioAssets.id, body.sourceAssetId), eq(studioAssets.userId, userId)));

    if (!source) return res.status(404).send("Source asset not found");

    // 1) créer job (pour éviter race : webhook arrive avant le job)
    const jobId = crypto.randomUUID();
    const videoKey = `lifee/videos/${jobId}.mp4`;

    const shareSlug = nanoid(10);

    await db.insert(lifeeJobs).values({
        id: jobId,
        status: "starting",
        progress: 0.3,
        shareSlug,
        progressMessage: "Démarrage…",
        videoKey, // on réserve la clé finale S3
        updatedAt: new Date(),
        createdAt: new Date(),
    });

    await db.insert(lifeeJobEvents).values({
        id: crypto.randomUUID(),
        jobId,
        type: "info",
        message: "Job créé, préparation Replicate…",
        createdAt: new Date(),
    });

    // 2) pre-signed url S3 -> start_image
    const startImageUrl = await presignGet(source.fileKey, 60 * 60);

    const prediction = await createPredictionLive(
        jobId,
        {
            startImageUrl,
            prompt: body.prompt,
            negativePrompt: body.negativePrompt,
            aspectRatio: body.aspectRatio,
            version: 'standard' // TODO CHECK IF HAS CREATOR PACKAGE
        });

    await db.update(lifeeJobs).set({
        replicatePredictionId: prediction.id,
        replicateStatus: prediction.status,
        updatedAt: new Date(),
    }).where(eq(lifeeJobs.id, jobId));

    await db.insert(lifeeJobEvents).values({
        id: crypto.randomUUID(),
        jobId,
        type: "replicate",
        message: `Prediction créée: ${prediction.id}`,
        createdAt: new Date(),
    });

    // 4) (option) créer l’asset vidéo tout de suite, pointant vers la future clé S3
    const [created] = await db
        .insert(studioAssets)
        .values({
            userId,
            type: "video",
            title: `${source.title} (AI)`,
            month: source.month,
            year: source.year,
            durationSec: Math.floor(body.durationSec),
            thumbnailKey: source.thumbnailKey ?? source.fileKey,
            fileKey: videoKey,
            isGenerated: true,
            context: body.prompt,
        })
        .returning();

    // 5) débit crédit (actuel : à la création)
    // Alternative “débit à succeeded” possible, mais nécessite un flag/idempotence DB — je te le fais si tu veux.
    await db.update(appUsers).set({
        credits: sql`${appUsers.credits}
        - 1`
    }).where(eq(appUsers.id, userId));

    return res.status(200).json({
        jobId,
        predictionId: prediction.id,
        id: created.id,
        type: "video",
        title: created.title,
        date: toMMYYYY(created.month, created.year),
        duration: created.durationSec ? `${created.durationSec}s` : undefined,
        thumbnailKey: created.thumbnailKey ?? undefined,
        fileKey: created.fileKey,
        isGenerated: true,
        context: created.context ?? undefined,
    });
}
