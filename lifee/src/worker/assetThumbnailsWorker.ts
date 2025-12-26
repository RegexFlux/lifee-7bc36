// File: src/worker/assetThumbnailsWorker.ts
import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn} from "node:child_process";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";

import {sql, and, eq, isNull} from "drizzle-orm";

import {db} from "@/lib/db";
import {assets, assetThumbnailJobs} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";
import {presignPutObject} from "@/lib/s3/presignPut";

type ClaimedJob = {
    id: string;
    assetId: string;
    attempts: number;
};

const POLL_MS = Number(process.env.THUMB_WORKER_POLL_MS || 1200);
const MAX_ATTEMPTS = Number(process.env.THUMB_WORKER_MAX_ATTEMPTS || 6);

function nowPlusMs(ms: number) {
    return new Date(Date.now() + ms);
}

function backoffMs(attempts: number) {
    // 1 -> 5s, 2 -> 10s, 3 -> 20s ... cap 10min
    const ms = Math.min(10 * 60_000, 5_000 * Math.pow(2, Math.max(0, attempts - 1)));
    return ms;
}

function makeThumbKey(params: { userId: string; assetId: string }) {
    // key S3 privé
    return `lifee/users/${params.userId}/assets/thumbs/${params.assetId}.jpg`;
}

async function sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
}

async function claimOne(): Promise<ClaimedJob | null> {
    // Claim atomique (Postgres) : SELECT ... FOR UPDATE SKIP LOCKED + UPDATE RETURNING
    // -> évite que 2 workers prennent le même job
    const r: any = await db.execute(sql`
        WITH c AS (SELECT id
                   FROM asset_thumbnail_jobs
                   WHERE status = 'queued'
                     AND (next_attempt_at IS NULL OR next_attempt_at <= now())
                   ORDER BY created_at ASC
            LIMIT 1
            FOR
        UPDATE SKIP LOCKED
            )
        UPDATE asset_thumbnail_jobs t
        SET status     = 'processing',
            started_at = now(),
            updated_at = now(),
            attempts   = attempts + 1
        WHERE t.id IN (SELECT id FROM c) RETURNING
      t.id,
      t.asset_id as "assetId",
      t.attempts
    `);

    const rows = r?.rows ?? r;
    const row = rows?.[0];
    if (!row?.id) return null;

    return {
        id: String(row.id),
        assetId: String(row.assetId),
        attempts: Number(row.attempts ?? 1),
    };
}

async function markDone(jobId: string) {
    await db.execute(sql`
        UPDATE asset_thumbnail_jobs
        SET status        = 'done',
            completed_at  = now(),
            updated_at    = now(),
            error_message = NULL
        WHERE id = ${jobId}
    `);
}

async function markRetry(jobId: string, attempts: number, errorMessage: string) {
    const next = nowPlusMs(backoffMs(attempts));
    await db.execute(sql`
        UPDATE asset_thumbnail_jobs
        SET status          = 'queued',
            next_attempt_at = ${next},
            updated_at      = now(),
            error_message   = ${errorMessage}
        WHERE id = ${jobId}
    `);
}

async function markError(jobId: string, errorMessage: string) {
    await db.execute(sql`
        UPDATE asset_thumbnail_jobs
        SET status        = 'error',
            completed_at  = now(),
            updated_at    = now(),
            error_message = ${errorMessage}
        WHERE id = ${jobId}
    `);
}

async function downloadToTemp(url: string, dstPath: string) {
    const resp = await fetch(url);
    if (!resp.ok || !resp.body) {
        throw new Error(`download failed (${resp.status})`);
    }
    const nodeStream = Readable.fromWeb(resp.body as any);
    await pipeline(nodeStream, fsSync.createWriteStream(dstPath));
}

async function runFfmpegThumb(inputPath: string, outputPath: string) {
    // thumbnail à ~1s (si vidéo courte, ffmpeg se débrouille), scale raisonnable
    const args = [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        "00:00:01",
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-vf",
        "scale=640:-1:force_original_aspect_ratio=decrease",
        "-q:v",
        "2",
        outputPath,
    ];

    await new Promise<void>((resolve, reject) => {
        const p = spawn("ffmpeg", args, {stdio: ["ignore", "pipe", "pipe"]});

        let err = "";
        p.stderr.on("data", (d) => (err += d.toString("utf8")));

        p.on("error", reject);
        p.on("close", (code) => {
            if (code === 0) return resolve();
            reject(new Error(`ffmpeg exited ${code}: ${err || "unknown"}`));
        });
    });
}

async function uploadThumbToS3(params: { key: string; filePath: string }) {
    const buf = await fs.readFile(params.filePath);

    const uploadUrl = await presignPutObject({
        key: params.key,
        contentType: "image/jpeg",
        expiresIn: 60 * 10,
    });

    const rr = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": String(buf.length),
        },
        body: buf,
    });

    if (!rr.ok) {
        const txt = await rr.text().catch(() => "");
        throw new Error(`upload failed (${rr.status}) ${txt}`);
    }
}

async function processJob(job: ClaimedJob) {
    // charge asset (doit être video uploadée)
    const asset = (
        await db
            .select({
                id: assets.id,
                userId: assets.userId,
                type: assets.type,
                fileKey: assets.fileKey,
                thumbnailKey: assets.thumbnailKey,
                generatedFromAssetId: assets.generatedFromAssetId,
            })
            .from(assets)
            .where(and(eq(assets.id, job.assetId), isNull(assets.deletedAt)))
            .limit(1)
    )[0];

    if (!asset) {
        // asset supprimé -> on termine
        await markDone(job.id);
        return;
    }

    // Si c'est une vidéo générée (thumbnailKey = generatedFromAsset.fileKey), pas besoin de worker
    if (asset.type === "video" && asset.generatedFromAssetId) {
        await markDone(job.id);
        return;
    }

    // Si déjà OK
    if (asset.thumbnailKey) {
        await markDone(job.id);
        return;
    }

    if (asset.type !== "video") {
        // on ne génère que pour les vidéos uploadées
        await markDone(job.id);
        return;
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "lifee-thumbs-"));
    const tmpIn = path.join(tmpDir, `${crypto.randomUUID()}.mp4`);
    const tmpOut = path.join(tmpDir, `thumb.jpg`);

    try {
        const url = await presignGetObject({key: asset.fileKey, expiresIn: 60 * 15});

        await downloadToTemp(url, tmpIn);
        await runFfmpegThumb(tmpIn, tmpOut);

        const thumbKey = makeThumbKey({userId: asset.userId, assetId: asset.id});

        await uploadThumbToS3({key: thumbKey, filePath: tmpOut});

        // écrit la clé sur l'asset
        await db
            .update(assets)
            .set({thumbnailKey: thumbKey})
            .where(eq(assets.id, asset.id));

        await markDone(job.id);
    } finally {
        // cleanup best-effort
        await fs.rm(tmpDir, {recursive: true, force: true}).catch(() => {
        });
    }
}

// combien on traite par “tour” quand la queue est vide
const HYDRATE_LIMIT = Number(process.env.THUMB_WORKER_HYDRATE_LIMIT || 25);
const ENQUEUE_LIMIT = Number(process.env.THUMB_WORKER_ENQUEUE_LIMIT || 15);

async function hydrateAndEnqueueMissingThumbs() {
    // (A) Hydrate thumbnails pour vidéos générées:
    // thumbnailKey = generatedFromAsset.fileKey
    // (on le fait en SQL pour être rapide)
    const patchedRes: any = await db.execute(sql`
        WITH c AS (SELECT a.id AS id, src.file_key AS thumb_key
                   FROM assets a
                            JOIN assets src ON src.id = a.generated_from_asset_id
                   WHERE a.type = 'video'
                     AND a.generated_from_asset_id IS NOT NULL
                     AND a.thumbnail_key IS NULL
                     AND a.deleted_at IS NULL
                     AND src.deleted_at IS NULL
            LIMIT ${HYDRATE_LIMIT}
            )
        UPDATE assets a
        SET thumbnail_key = c.thumb_key FROM c
        WHERE a.id = c.id
            RETURNING a.id
    `);

    const patchedRows = patchedRes?.rows ?? patchedRes ?? [];
    const patchedCount = Array.isArray(patchedRows) ? patchedRows.length : 0;

    // (B) Enqueue jobs pour vidéos uploadées sans thumb
    // - type=video
    // - generated_from_asset_id IS NULL
    // - thumbnail_key IS NULL
    // - deleted_at IS NULL
    const missing = await db
        .select({id: assets.id, userId: assets.userId})
        .from(assets)
        .where(
            and(
                eq(assets.type, "video"),
                isNull(assets.generatedFromAssetId),
                isNull(assets.thumbnailKey),
                isNull(assets.deletedAt)
            )
        )
        .limit(ENQUEUE_LIMIT);

    if (!missing.length) {
        return {patchedCount, enqueuedCount: 0};
    }

    const values = missing.map((m) => ({
        id: crypto.randomUUID(),
        assetId: m.id,
        userId: m.userId,
        status: "queued" as const,
        attempts: 0,
        // nextAttemptAt null
        // startedAt null
        // completedAt null
        // errorMessage null
        createdAt: new Date(),
        updatedAt: new Date(),
    }));

    // On tente un insert batch, et si ta version drizzle ne supporte pas onConflictDoNothing,
    // on retombe en insert “best-effort” 1 par 1.
    let enqueuedCount = 0;

    try {
        const q = db.insert(assetThumbnailJobs).values(values);
        const q2 = (q.onConflictDoNothing?.({
            target: assetThumbnailJobs.assetId,
        }) ?? q);

        const inserted = await q2.returning?.({assetId: assetThumbnailJobs.assetId});
        enqueuedCount = Array.isArray(inserted) ? inserted.length : values.length;
    } catch (e) {
        // fallback: insert unitaire en ignorant les duplicates
        for (const v of values) {
            try {
                await db.insert(assetThumbnailJobs).values(v);
                enqueuedCount++;
            } catch {
                // duplicate / conflict -> ignore
            }
        }
    }

    return {patchedCount, enqueuedCount};
}


async function main() {
    console.log("[thumb-worker] starting…", {pollMs: POLL_MS, maxAttempts: MAX_ATTEMPTS});

    let running = true;
    const stop = () => {
        running = false;
        console.log("[thumb-worker] stopping…");
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);

    while (running) {
        const job = await claimOne().catch((e) => {
            console.error("[thumb-worker] claim failed", e);
            return null;
        });

        if (!job) {
            // ✅ Quand la queue est vide:
            // 1) hydrate les vidéos générées (thumbnailKey = parent.fileKey)
            // 2) enqueue les vidéos uploadées sans thumb
            try {
                const {patchedCount, enqueuedCount} = await hydrateAndEnqueueMissingThumbs();

                if (patchedCount || enqueuedCount) {
                    console.log("[thumb-worker] hydrated/enqueued", {patchedCount, enqueuedCount});
                    // pas de sleep: on boucle direct, claimOne va récupérer ce qu'on vient d'enqueuer
                    continue;
                }
            } catch (e) {
                console.warn("[thumb-worker] hydrate/enqueue failed", e);
            }

            await sleep(POLL_MS);
            continue;
        }

        try {
            await processJob(job);
        } catch (e: any) {
            const msg = String(e?.message || e || "unknown");
            console.error(e);

            if (job.attempts >= MAX_ATTEMPTS) {
                console.error("[thumb-worker] job error (max attempts)", {jobId: job.id, assetId: job.assetId, msg});
                await markError(job.id, msg);
            } else {
                console.warn("[thumb-worker] job failed -> retry", {
                    jobId: job.id,
                    assetId: job.assetId,
                    attempts: job.attempts,
                    msg,
                });
                await markRetry(job.id, job.attempts, msg);
            }
        }
    }
}


void main();
