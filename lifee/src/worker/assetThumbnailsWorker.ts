// File: src/worker/assetThumbnailsWorker.ts
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {spawn} from "node:child_process";
import {sql} from "drizzle-orm";

import {db} from "@/lib/db/index";
import {assets} from "@/lib/db/schema";
import {makeAssetThumbnailObjectKey} from "@/lib/assets/keys";
import {presignGetObject} from "@/lib/s3/presignGet";
import {putObject} from "@/lib/s3/putObject";

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function runFfmpegExtractJpg(params: { inputPath: string; outputPath: string }) {
    return new Promise<void>((resolve, reject) => {
        const p = spawn(
            "ffmpeg",
            [
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-ss",
                "0.5",
                "-i",
                params.inputPath,
                "-frames:v",
                "1",
                "-q:v",
                "2",
                params.outputPath,
            ],
            {stdio: ["ignore", "pipe", "pipe"]}
        );

        let err = "";
        p.stderr.on("data", (d) => (err += String(d)));
        p.on("error", reject);
        p.on("close", (code) => {
            if (code === 0) return resolve();
            reject(new Error(`ffmpeg failed (code=${code}): ${err || "unknown"}`));
        });
    });
}

/**
 * Claim 1 job atomiquement (Postgres).
 * On lock + set processing via UPDATE ... RETURNING
 */
async function claimOneJob() {
    const r = await db.execute(sql`
        UPDATE "asset_thumbnail_jobs"
        SET "status"     = 'processing',
            "locked_at"  = NOW(),
            "updated_at" = NOW()
        WHERE "id" IN (SELECT "id"
                       FROM "asset_thumbnail_jobs"
                       WHERE "status" = 'queued'
                       ORDER BY "created_at" ASC
            FOR
        UPDATE SKIP LOCKED
            LIMIT 1
            )
            RETURNING "id", "user_id" as "userId", "asset_id" as "assetId", "attempts" as "attempts"
    `);

    // @ts-ignore drizzle driver rows
    const rows = r?.rows ?? [];
    return rows[0] as null | { id: string; userId: string; assetId: string; attempts: number };
}

async function markJobError(jobId: string, message: string) {
    await db.execute(sql`
        UPDATE "asset_thumbnail_jobs"
        SET "status"     = 'error',
            "attempts"   = "attempts" + 1,
            "last_error" = ${message},
            "updated_at" = NOW()
        WHERE "id" = ${jobId}
    `);
}

async function markJobDone(jobId: string) {
    await db.execute(sql`
        UPDATE "asset_thumbnail_jobs"
        SET "status"     = 'done',
            "done_at"    = NOW(),
            "updated_at" = NOW()
        WHERE "id" = ${jobId}
    `);
}

async function markJobSkipped(jobId: string, reason: string) {
    await db.execute(sql`
        UPDATE "asset_thumbnail_jobs"
        SET "status"     = 'skipped',
            "last_error" = ${reason},
            "done_at"    = NOW(),
            "updated_at" = NOW()
        WHERE "id" = ${jobId}
    `);
}

export default async function main() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const job = await claimOneJob();
        if (!job) {
            await sleep(650);
            continue;
        }

        try {
            const asset = (
                await db
                    .select()
                    .from(assets)
                    .where(sql`${assets.id}
                    =
                    ${job.assetId}`)
                    .limit(1)
            )[0];

            if (!asset) {
                await markJobSkipped(job.id, "Asset not found");
                continue;
            }

            // On ne génère que pour vidéo uploadée
            if (asset.type !== "video" || asset.generatedFromAssetId) {
                await markJobSkipped(job.id, "Not an uploaded video");
                continue;
            }

            // si déjà thumb => done
            if (asset.thumbnailKey) {
                await markJobDone(job.id);
                continue;
            }

            const tmpDir = path.join("/tmp", "lifee-thumbs");
            await fs.mkdir(tmpDir, {recursive: true});

            const rand = crypto.randomUUID();
            const inputPath = path.join(tmpDir, `${rand}.mp4`);
            const outputPath = path.join(tmpDir, `${rand}.jpg`);

            // download video via presign
            const url = await presignGetObject({key: asset.fileKey, expiresIn: 60 * 10});
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
            const buf = Buffer.from(await resp.arrayBuffer());
            await fs.writeFile(inputPath, buf);

            // extract frame
            await runFfmpegExtractJpg({inputPath, outputPath});

            const jpg = await fs.readFile(outputPath);

            // upload thumb
            const thumbKey = makeAssetThumbnailObjectKey({userId: asset.userId, assetId: asset.id, ext: "jpg"});
            await putObject({key: thumbKey, body: jpg, contentType: "image/jpeg"});

            // update asset
            await db
                .update(assets)
                .set({thumbnailKey: thumbKey})
                .where(sql`${assets.id}
                =
                ${asset.id}`);

            await markJobDone(job.id);

            // cleanup best effort
            await fs.rm(inputPath, {force: true}).catch(() => {
            });
            await fs.rm(outputPath, {force: true}).catch(() => {
            });
        } catch (e: any) {
            await markJobError(job.id, e?.message || "Unknown error");
        }
    }
}

void main();
