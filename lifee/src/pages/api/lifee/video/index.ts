// pages/api/lifee/video/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { lifeeJobs, lifeeJobEvents } from "@/lib/db/schema";

import { putBufferToS3 } from "@/lib/s3";

import { getClientIp, hashIp } from "@/lib/security/ip";
import {
    enforceMaxActiveJobsOrThrow,
    enforceOneTryPerIpOrThrow,
    releaseIpAttempt,
    reserveDailyRunOrThrow,
} from "@/lib/security/limits";

import { getProviderMode, createPredictionLive } from "@/lib/replicate/provider";
import { defaultLifeePrompt } from "@/lib/replicate";

export const config = {
    api: { bodyParser: false },
};

type ApiOk = {
    jobId: string;
    shareUrl: string;
    statusUrl: string;
};

type ApiErr = {
    error: string;
};

function appUrl(req: NextApiRequest) {
    const u = process.env.APP_URL;
    if (u) return u.replace(/\/$/, "");
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
    return `${proto}://${host}`;
}

function parseForm(req: NextApiRequest) {
    const maxMb = Number(process.env.LIFEE_MAX_FILE_MB || "10");
    const form = formidable({
        multiples: false,
        maxFileSize: maxMb * 1024 * 1024,
        keepExtensions: true,
        uploadDir: "/tmp",
    });

    return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
        form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
    });
}

function guessExt(mime: string, original: string) {
    const extFromName = path.extname(original || "").toLowerCase();
    if (extFromName) return extFromName;

    if (mime === "image/png") return ".png";
    if (mime === "image/webp") return ".webp";
    if (mime === "image/heic" || mime === "image/heif") return ".heic";
    return ".jpg";
}

function normalizePrompt(fields: formidable.Fields) {
    const p = typeof fields.prompt === "string" ? fields.prompt.trim() : "";
    return p || defaultLifeePrompt();
}

function shouldEnforceLimits(mode: "live" | "mock") {
    // ✅ En prod: oui
    // ✅ En mock/dev: on évite de bloquer ton dev
    const flag = process.env.LIFEE_ENFORCE_LIMITS;
    if (flag) return flag.toLowerCase() === "true";
    if (mode === "mock") return false;
    return process.env.NODE_ENV === "production";
}

async function addEvent(jobId: string, type: string, message: string) {
    await db.insert(lifeeJobEvents).values({
        id: crypto.randomUUID(),
        jobId,
        type,
        message,
        createdAt: new Date(),
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiOk | ApiErr>) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const mode = getProviderMode(); // "mock" | "live"
    const enforceLimits = shouldEnforceLimits(mode);

    const jobId = crypto.randomUUID();
    const shareSlug = nanoid(10);

    const ip = getClientIp(req);
    const ipHash = hashIp(ip);

    let jobCreated = false;
    let predictionCreated = false;

    try {
        // Anti-flood global: trop de jobs en cours
        if (enforceLimits) await enforceMaxActiveJobsOrThrow();

        // Crée le job dès le début (pour pouvoir informer/poller immédiatement)
        await db.insert(lifeeJobs).values({
            id: jobId,
            shareSlug,
            status: "uploading",
            progress: 0.05,
            progressMessage: "Réception de la photo…",
            createdAt: new Date(),
            updatedAt: new Date(),
            prompt: defaultLifeePrompt(),
        });
        jobCreated = true;
        await addEvent(jobId, "info", "Job créé");

        // 1 essai par utilisateur (IP) (prod typiquement)
        if (enforceLimits) {
            await enforceOneTryPerIpOrThrow({ ipHash, jobId });
            await addEvent(jobId, "info", "Quota IP réservé (1 essai)");
        }

        // Parse multipart
        const { fields, files } = await parseForm(req);
        const _files =
            (files.photo as unknown as formidable.File) ||
            (files.file as unknown as formidable.File) ||
            (Object.values(files)[0] as unknown as formidable.File);

        const file = _files[0];

        if (!file) {
            // on libère l’essai si pas de fichier (pas de coût)
            if (enforceLimits) await releaseIpAttempt({ ipHash, jobId });
            throw Object.assign(new Error("No file uploaded (field: photo|file)"), { statusCode: 400 });
        }

        const mime = file.mimetype || "";
        if (!mime.startsWith("image/")) {
            if (enforceLimits) await releaseIpAttempt({ ipHash, jobId });
            throw Object.assign(new Error("Invalid file type (image only)"), { statusCode: 400 });
        }

        const original = file.originalFilename || "photo";
        const ext = guessExt(mime, original);
        const buffer = await fs.readFile(file.filepath);

        // Stockage photo S3
        const imageKey = `lifee/images/${jobId}${ext}`;
        await putBufferToS3({ key: imageKey, buffer, contentType: mime });

        await db
            .update(lifeeJobs)
            .set({
                imageKey,
                status: "queued",
                progress: 0.18,
                progressMessage: "Photo stockée. Préparation de la génération…",
                updatedAt: new Date(),
                prompt: normalizePrompt(fields),
            })
            .where(eq(lifeeJobs.id, jobId));

        await addEvent(jobId, "info", "Photo enregistrée sur S3");

        // MOCK mode (zéro coût Replicate)
        if (mode === "mock") {
            await db
                .update(lifeeJobs)
                .set({
                    replicatePredictionId: `mock_${jobId}`,
                    replicateStatus: "starting",
                    status: "starting",
                    progress: 0.3,
                    progressMessage: "Génération mock…",
                    updatedAt: new Date(),
                })
                .where(eq(lifeeJobs.id, jobId));

            await addEvent(jobId, "info", "Mock mode: Replicate non appelé");

            const base = appUrl(req);
            return res.status(200).json({
                jobId,
                shareUrl: `${base}/v/${shareSlug}`,
                statusUrl: `${base}/api/lifee/video/${jobId}`,
            });
        }

        // LIVE mode: anti-frais hard-cap journalier
        if (enforceLimits) await reserveDailyRunOrThrow();

        // Lance Replicate (Kling 2.5 Turbo Pro) via provider
        const base = appUrl(req);
        const webhookUrl = `${base}/api/webhooks/replicate?jobId=${encodeURIComponent(jobId)}`;

        const prompt = normalizePrompt(fields);

        const pred = await createPredictionLive({
            startImageBuffer: buffer,
            prompt,
            webhookUrl,
        });

        predictionCreated = true;

        await db
            .update(lifeeJobs)
            .set({
                replicatePredictionId: pred.id,
                replicateStatus: pred.status,
                status: "starting",
                progress: 0.3,
                progressMessage: "Génération lancée…",
                updatedAt: new Date(),
            })
            .where(eq(lifeeJobs.id, jobId));

        await addEvent(jobId, "replicate", `Replicate démarré (prediction ${pred.id})`);

        return res.status(200).json({
            jobId,
            shareUrl: `${base}/v/${shareSlug}`,
            statusUrl: `${base}/api/lifee/video/${jobId}`,
        });
    } catch (e: any) {
        const status = Number(e?.statusCode) || 500;
        const msg = e?.message || "Internal error";

        // Si on a réservé l’essai IP mais qu’on n’a pas lancé Replicate => on libère (pas de coût)
        if (enforceLimits && !predictionCreated) {
            try {
                await releaseIpAttempt({ ipHash, jobId });
            } catch {
                // ignore
            }
        }

        // Best-effort: marquer le job failed si créé
        if (jobCreated) {
            try {
                await db
                    .update(lifeeJobs)
                    .set({
                        status: "failed",
                        progress: 1,
                        progressMessage: "Erreur",
                        error: msg,
                        updatedAt: new Date(),
                    })
                    .where(eq(lifeeJobs.id, jobId));

                await addEvent(jobId, "warn", `Erreur: ${msg}`);
            } catch {
                // ignore
            }
        }

        return res.status(status).json({ error: msg });
    }
}
