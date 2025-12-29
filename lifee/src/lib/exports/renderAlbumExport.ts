// File: src/lib/exports/renderAlbumExport.ts
import fs from "fs";
import os from "os";
import path from "path";
import {asc, eq, sql} from "drizzle-orm";
import {PutObjectCommand} from "@aws-sdk/client-s3";

import {db} from "@/lib/db";
import {albums, albumItems, assets, exportJobs, musics, exportJobItems} from "@/lib/db/schema";
import {copyS3Object} from "@/lib/s3/copyObject";
import {downloadToFile} from "@/lib/exports/downloadToFile";
import {
    ffmpegNormalizeClip,
    ffmpegAddMusic,
    ffmpegImageToClip,
    ffprobeDurationSec,
    ffmpegConcatWithTransitions,
} from "@/lib/exports/ffmpeg";
import {presignGetObject} from "@/lib/s3/presignGet";
import {S3_BUCKET_NAME, s3Client} from "@/lib/s3/client";
import {Upload} from "@aws-sdk/lib-storage";
import {createReadStream} from "node:fs";
import {getS3SizeBytes} from "@/lib/s3/getS3SizeBytes";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

const IMAGE_DURATION_SEC = 2.5;     // ✅ fixe
const TRANSITION_SEC = 0.35;        // ✅ transition

export async function renderAlbumExport(params: { exportJobId: string }) {
    const job = (await db.select().from(exportJobs).where(eq(exportJobs.id, params.exportJobId)).limit(1))[0];
    if (!job) throw new Error("Export job not found");
    if (job.status !== "rendering") throw new Error("Export job not in rendering state");

    const album = (await db.select().from(albums).where(eq(albums.id, job.albumId)).limit(1))[0];
    if (!album) throw new Error("Album not found");

    const items = await db
        .select({
            position: exportJobItems.position,
            assetId: assets.id,
            type: assets.type,
            fileKey: assets.fileKey,
        })
        .from(exportJobItems)
        .innerJoin(
            assets,
            // assets.id = COALESCE(resolved_asset_id, source_asset_id)
            sql`${assets.id}
            = COALESCE(
            ${exportJobItems.resolvedAssetId},
            ${exportJobItems.sourceAssetId}
            )`
        )
        .where(eq(exportJobItems.exportJobId, job.id))
        .orderBy(asc(exportJobItems.position));

    if (!items.length) throw new Error("Album has no items");

    const MAX_ITEMS = 120;
    const MAX_TOTAL_INPUT_BYTES = 1_200_000_000; // ~1.2GB

    if (items.length > MAX_ITEMS) {
        await db.update(exportJobs).set({
            status: "error",
            errorMessage: `Too many items (max ${MAX_ITEMS})`,
            updatedAt: new Date(),
        }).where(eq(exportJobs.id, job.id));
        throw new Error(`Too many items (max ${MAX_ITEMS})`);
    }

// Taille totale des inputs S3 (rapide, sans download)
    let totalBytes = 0;
    for (const it of items) {
        totalBytes += await getS3SizeBytes(it.fileKey);
        // Early break
        if (totalBytes > MAX_TOTAL_INPUT_BYTES) break;
    }

    if (totalBytes > MAX_TOTAL_INPUT_BYTES) {
        const msg = `Export too large: ${(totalBytes / 1e6).toFixed(0)}MB inputs (max ${(MAX_TOTAL_INPUT_BYTES / 1e6).toFixed(0)}MB).`;
        await db.update(exportJobs).set({
            status: "error",
            errorMessage: msg,
            updatedAt: new Date(),
        }).where(eq(exportJobs.id, job.id));
        throw new Error(msg);
    }


    await db.update(exportJobs).set({progress: 10, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));
    const exportKeyBase = `lifee/users/${job.userId}/exports/${job.id}`;

    // ✅ Single item : on garde le fast path (avec musique via ffmpeg si besoin)
    if (items.length === 1) {
        const it = items[0];
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifee-export-"));
        try {
            const finalKey = `${exportKeyBase}.mp4`;
            const basePath = path.join(tmpDir, "base.mp4");

            if (it.type === "video") {
                if (!album.musicId) {
                    await copyS3Object({fromKey: it.fileKey, toKey: finalKey, contentType: "video/mp4"});
                    await db.transaction(async (tx) => {
                        await tx.update(exportJobs).set({
                            status: "done",
                            progress: 100,
                            videoKey: finalKey,
                            updatedAt: new Date()
                        }).where(eq(exportJobs.id, job.id));
                        await tx.update(albums).set({
                            updatedAt: new Date()
                        }).where(eq(albums.id, album.id));
                    });
                    return {videoKey: finalKey};
                }
                const vUrl = await presignGetObject({key: it.fileKey, expiresIn: 60 * 60});
                await downloadToFile(vUrl, basePath);
            } else if (it.type === "image") {
                const imgUrl = await presignGetObject({key: it.fileKey, expiresIn: 60 * 60});
                const imgPath = path.join(tmpDir, "in.jpg");
                await downloadToFile(imgUrl, imgPath);
                await ffmpegImageToClip({
                    imagePath: imgPath,
                    outPath: basePath,
                    width: WIDTH,
                    height: HEIGHT,
                    fps: FPS,
                    durationSec: IMAGE_DURATION_SEC
                });
            } else {
                throw new Error(`Unsupported asset type: ${it.type}`);
            }

            let finalPath = basePath;
            if (album.musicId) {
                const m = (await db.select().from(musics).where(eq(musics.id, album.musicId)).limit(1))[0];
                if (!m?.fileKey) throw new Error("Music not found");
                const mUrl = await presignGetObject({key: m.fileKey, expiresIn: 60 * 60});
                const mPath = path.join(tmpDir, "music.mp3");
                await downloadToFile(mUrl, mPath);

                const withMusic = path.join(tmpDir, "with-music.mp4");
                await ffmpegAddMusic({videoIn: basePath, musicIn: mPath, outPath: withMusic});
                finalPath = withMusic;
            }

            await db.update(exportJobs).set({progress: 90, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));
            await new Upload({
                client: s3Client,
                params: {
                    Bucket: S3_BUCKET_NAME,
                    Key: finalKey,
                    Body: createReadStream(finalPath),
                    ContentType: "video/mp4",
                },
            }).done();

            await db.transaction(async (tx) => {
                await tx.update(exportJobs).set({
                    status: "done",
                    progress: 100,
                    videoKey: finalKey,
                    updatedAt: new Date()
                }).where(eq(exportJobs.id, job.id));
                await tx.update(albums).set({updatedAt: new Date()}).where(eq(albums.id, album.id));
            });

            return {videoKey: finalKey};
        } finally {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        }
    }

    // ✅ Multi items : normalize/video + image->clip, puis transitions
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifee-export-"));
    try {
        const clipPaths: string[] = [];

        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const outClip = path.join(tmpDir, `clip-${i}.mp4`);

            if (it.type === "video") {
                const vUrl = await presignGetObject({key: it.fileKey, expiresIn: 60 * 60});
                const inPath = path.join(tmpDir, `in-${i}.mp4`);
                await downloadToFile(vUrl, inPath);
                await ffmpegNormalizeClip({inPath, outPath: outClip, width: WIDTH, height: HEIGHT, fps: FPS});
            } else if (it.type === "image") {
                const imgUrl = await presignGetObject({key: it.fileKey, expiresIn: 60 * 60});
                const imgPath = path.join(tmpDir, `in-${i}.jpg`);
                await downloadToFile(imgUrl, imgPath);
                await ffmpegImageToClip({
                    imagePath: imgPath,
                    outPath: outClip,
                    width: WIDTH,
                    height: HEIGHT,
                    fps: FPS,
                    durationSec: IMAGE_DURATION_SEC
                });
            } else {
                throw new Error(`Unsupported asset type: ${it.type}`);
            }

            clipPaths.push(outClip);

            const pct = 15 + Math.round(((i + 1) / items.length) * 35); // 15 -> 50
            await db.update(exportJobs).set({progress: pct, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));
        }

        // Durées réelles (vidéo = durée vidéo, image = duration fix mais on lit aussi au probe)
        const durationsSec = [];
        for (let i = 0; i < clipPaths.length; i++) {
            durationsSec.push(await ffprobeDurationSec(clipPaths[i]));
        }

        await db.update(exportJobs).set({progress: 60, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));

        // Concat avec transitions
        const transitioned = path.join(tmpDir, "transitioned.mp4");
        await ffmpegConcatWithTransitions({
            clipPaths,
            durationsSec,
            outPath: transitioned,
            transitionSec: TRANSITION_SEC,
        });

        await db.update(exportJobs).set({progress: 80, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));

        // Musique optionnelle
        let finalPath = transitioned;
        if (album.musicId) {
            const m = (await db.select().from(musics).where(eq(musics.id, album.musicId)).limit(1))[0];
            if (!m?.fileKey) throw new Error("Music not found");
            const mUrl = await presignGetObject({key: m.fileKey, expiresIn: 60 * 60});
            const mPath = path.join(tmpDir, "music.mp3");
            await downloadToFile(mUrl, mPath);

            const withMusic = path.join(tmpDir, "with-music.mp4");
            await ffmpegAddMusic({videoIn: transitioned, musicIn: mPath, outPath: withMusic});
            finalPath = withMusic;

            await db.update(exportJobs).set({progress: 92, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));
        }

        const finalKey = `${exportKeyBase}.mp4`;
        await new Upload({
            client: s3Client,
            params: {
                Bucket: S3_BUCKET_NAME,
                Key: finalKey,
                Body: createReadStream(finalPath),
                ContentType: "video/mp4",
            },
        }).done();

        await db.transaction(async (tx) => {
            await tx.update(exportJobs).set({
                status: "done",
                progress: 100,
                videoKey: finalKey,
                updatedAt: new Date()
            }).where(eq(exportJobs.id, job.id));
            await tx.update(albums).set({updatedAt: new Date()}).where(eq(albums.id, album.id));
        });

        return {videoKey: finalKey};
    } finally {
        fs.rmSync(tmpDir, {recursive: true, force: true});
    }
}
