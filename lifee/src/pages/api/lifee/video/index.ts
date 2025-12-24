// pages/api/lifee/video/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { type Fields, type Files, type File as FormidableFile } from "formidable";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { lifeeJobs, lifeeJobEvents } from "@/lib/db/schema";

import { presignGet, putBufferToS3 } from "@/lib/s3";

import { getClientIp, hashIp } from "@/lib/security/ip";
import {
    enforceMaxActiveJobsOrThrow,
    enforceOneTryPerIpOrThrow,
    releaseIpAttempt,
    reserveDailyRunOrThrow,
} from "@/lib/security/limits";

import { getProviderMode, createPredictionLive } from "@/lib/replicate/provider";
import { defaultLifeeDemoPrompt } from "@/lib/replicate";

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

type EventType = "info" | "warn" | "replicate";

function appUrl(req: NextApiRequest): string {
    const u = process.env.APP_URL;
    if (u) return u.replace(/\/$/, "");
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
    return `${proto}://${host}`;
}

function shouldEnforceLimits(mode: "live" | "mock"): boolean {
    const flag = process.env.LIFEE_ENFORCE_LIMITS;
    if (flag) return flag.toLowerCase() === "true";
    if (mode === "mock") return false;
    return process.env.NODE_ENV === "production";
}

function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
    const maxMb = Number(process.env.LIFEE_MAX_FILE_MB || "10");
    const form = formidable({
        multiples: false,
        maxFileSize: maxMb * 1024 * 1024,
        keepExtensions: true,
        uploadDir: "/tmp",
    });

    return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
    });
}

function pickFirstFile(files: Files): FormidableFile | null {
    const candidate =
        (files.photo as FormidableFile | FormidableFile[] | undefined) ??
        (files.file as FormidableFile | FormidableFile[] | undefined) ??
        (Object.values(files)[0] as FormidableFile | FormidableFile[] | undefined);

    if (!candidate) return null;
    return Array.isArray(candidate) ? candidate[0] ?? null : candidate;
}

function guessExt(mime: string, original: string): string {
    const extFromName = path.extname(original || "").toLowerCase();
    if (extFromName) return extFromName;

    if (mime === "image/png") return ".png";
    if (mime === "image/webp") return ".webp";
    if (mime === "image/heic" || mime === "image/heif") return ".heic";
    return ".jpg";
}

function normalizePrompt(fields: Fields): string {
    const raw = fields.prompt;
    const s =
        typeof raw === "string"
            ? raw
            : Array.isArray(raw) && typeof raw[0] === "string"
                ? raw[0]
                : "";
    const p = s.trim();
    return p || defaultLifeeDemoPrompt();
}

async function addEvent(jobId: string, type: EventType, message: string) {
    await db.insert(lifeeJobEvents).values({
        id: crypto.randomUUID(),
        jobId,
        type,
        message,
        createdAt: new Date(),
    });
}

function errorWithStatus(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode });
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
    let ipAttemptReserved = false;
    let predictionCreated = false;

    let tmpFilepath: string | null = null;

    try {
        // Anti-flood global: trop de jobs en cours
        if (enforceLimits) await enforceMaxActiveJobsOrThrow();

        // Crée le job très tôt pour permettre un polling immédiat
        const now = new Date();
        await db.insert(lifeeJobs).values({
            id: jobId,
            shareSlug,
            status: "uploading",
            progress: 0.05,
            progressMessage: "Réception de la photo…",
            createdAt: now,
            updatedAt: now,
            prompt: defaultLifeeDemoPrompt(),
        });
        jobCreated = true;
        await addEvent(jobId, "info", "Job créé");

        // Limite : 1 génération par IP (en prod typiquement)
        if (enforceLimits) {
            await enforceOneTryPerIpOrThrow({ ipHash, jobId });
            ipAttemptReserved = true;
            await addEvent(jobId, "info", "Quota IP réservé (1 essai)");
        }

        // Parse multipart
        const { fields, files } = await parseForm(req);
        const file = pickFirstFile(files);

        if (!file) {
            // Pas de fichier => on ne “consomme” pas un essai
            if (enforceLimits && ipAttemptReserved) {
                await releaseIpAttempt({ ipHash, jobId });
                ipAttemptReserved = false;
            }
            throw errorWithStatus("No file uploaded (field: photo|file)", 400);
        }

        tmpFilepath = file.filepath;

        const mime = file.mimetype || "";
        if (!mime.startsWith("image/")) {
            if (enforceLimits && ipAttemptReserved) {
                await releaseIpAttempt({ ipHash, jobId });
                ipAttemptReserved = false;
            }
            throw errorWithStatus("Invalid file type (image only)", 400);
        }

        const original = file.originalFilename || "photo";
        const ext = guessExt(mime, original);

        const buffer = await fs.readFile(file.filepath);

        // Cleanup tmp dès que possible (best effort)
        try {
            await fs.unlink(file.filepath);
            tmpFilepath = null;
        } catch {
            // ignore
        }

        // Stockage photo S3
        const imageKey = `lifee/images/${jobId}${ext}`;
        await putBufferToS3({ key: imageKey, buffer, contentType: mime });

        const prompt = normalizePrompt(fields);

        await db
            .update(lifeeJobs)
            .set({
                imageKey,
                status: "queued",
                progress: 0.18,
                progressMessage: "Photo stockée. Préparation de la génération…",
                updatedAt: new Date(),
                prompt,
            })
            .where(eq(lifeeJobs.id, jobId));

        await addEvent(jobId, "info", "Photo enregistrée sur S3");

        const base = appUrl(req);

        // MOCK mode : zéro coût Replicate
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

            return res.status(200).json({
                jobId,
                shareUrl: `${base}/v/${shareSlug}`,
                statusUrl: `${base}/api/lifee/video/${jobId}`,
            });
        }

        // LIVE mode : hard-cap journalier (anti-frais)
        if (enforceLimits) await reserveDailyRunOrThrow();

        const startImageUrl = await presignGet(imageKey, 60 * 60);

        const pred = await createPredictionLive(jobId, {
            startImageUrl,
            prompt,
            version: "demo",
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
    } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string };
        const status = Number(err?.statusCode) || 500;
        const msg = err?.message || "Internal error";

        // Cleanup tmp (si pas supprimé plus tôt)
        if (tmpFilepath) {
            try {
                await fs.unlink(tmpFilepath);
            } catch {
                // ignore
            }
        }

        // Si on a réservé l’essai IP mais qu’on n’a PAS lancé Replicate => on libère (pas de coût)
        // ⚠️ Si tu veux “1 essai par IP quoi qu’il arrive (même si erreur upload)”, garde ce release.
        // ⚠️ Si tu veux “1 essai consommé dès qu’un job est créé”, supprime ce release.
        if (enforceLimits && ipAttemptReserved && !predictionCreated) {
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
