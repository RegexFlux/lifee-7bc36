// src/lib/exports/renderAlbumExport.ts
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import {asc, eq} from "drizzle-orm";

import {db} from "@/lib/db";
import {albums, albumItems, assets, exportJobs, musics} from "@/lib/db/schema";
import {PutObjectCommand} from "@aws-sdk/client-s3";

import {copyS3Object} from "@/lib/s3/copyObject";
import {downloadToFile} from "@/lib/exports/downloadToFile";
import {
    ffmpegNormalizeClip,
    ffmpegConcatFromList,
    ffmpegAddMusic,
} from "@/lib/exports/ffmpeg";
import {presignGetObject} from "@/lib/s3/presignGet";
import {S3_BUCKET_NAME, s3Client} from "@/lib/s3/client";

export async function renderAlbumExport(params: { exportJobId: string }) {
    const job = (await db.select().from(exportJobs).where(eq(exportJobs.id, params.exportJobId)).limit(1))[0];
    if (!job) throw new Error("Export job not found");
    if (job.status !== "rendering") throw new Error("Export job not in rendering state");

    const album = (await db.select().from(albums).where(eq(albums.id, job.albumId)).limit(1))[0];
    if (!album) throw new Error("Album not found");

    const items = await db
        .select({
            position: albumItems.position,
            assetId: assets.id,
            type: assets.type,
            fileKey: assets.fileKey,
            thumbnailKey: assets.thumbnailKey,
        })
        .from(albumItems)
        .innerJoin(assets, eq(assets.id, albumItems.assetId))
        .where(eq(albumItems.albumId, album.id))
        .orderBy(asc(albumItems.position));

    if (!items.length) throw new Error("Album has no items");

    // v1 simple: export uniquement vidéos (les images doivent d’abord être générées en vidéo via Replicate)
    const nonVideo = items.find((it) => it.type !== "video");
    if (nonVideo) throw new Error("Export v1 supports only video items (generate videos first)");

    await db.update(exportJobs).set({progress: 10, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));

    // ✅ Optimisation: 1 vidéo => copy direct (puis musique optionnelle)
    const exportKeyBase = `lifee/users/${job.userId}/exports/${job.id}`;
    if (items.length === 1) {
        const single = items[0];
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifee-export-"));
        try {
            const finalKey = `${exportKeyBase}.mp4`;

            // si musique : on doit passer par ffmpeg (download + music + upload)
            if (album.musicId) {
                const vUrl = await presignGetObject({key: single.fileKey, expiresIn: 60 * 60});
                const vPath = path.join(tmpDir, "in.mp4");
                await downloadToFile(vUrl, vPath);

                const m = (await db.select().from(musics).where(eq(musics.id, album.musicId)).limit(1))[0];
                if (!m?.fileKey) throw new Error("Music not found");

                const mUrl = await presignGetObject({key: m.fileKey, expiresIn: 60 * 60});
                const mPath = path.join(tmpDir, "music.mp3");
                await downloadToFile(mUrl, mPath);

                const outPath = path.join(tmpDir, "out.mp4");
                await ffmpegAddMusic({videoIn: vPath, musicIn: mPath, outPath});

                await db.update(exportJobs).set({progress: 90, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));

                const buf = fs.readFileSync(outPath);
                await s3Client.send(new PutObjectCommand({
                    Bucket: S3_BUCKET_NAME,
                    Key: finalKey,
                    Body: buf,
                    ContentType: "video/mp4"
                }));
            } else {
                // pas de musique => copy S3 instant
                await copyS3Object({fromKey: single.fileKey, toKey: finalKey, contentType: "video/mp4"});
            }

            await db.transaction(async (tx) => {
                await tx.update(exportJobs).set({
                    status: "done",
                    progress: 100,
                    videoKey: finalKey,
                    updatedAt: new Date(),
                }).where(eq(exportJobs.id, job.id));

                await tx.update(albums).set({
                    status: "exported",
                    updatedAt: new Date(),
                }).where(eq(albums.id, album.id));
            });

            return {videoKey: finalKey};
        } finally {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        }
    }

    // Multi clips => normalize -> concat -> add music -> upload
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifee-export-"));
    try {
        await db.update(exportJobs).set({progress: 15, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));

        // Download + normalize
        const normalizedPaths: string[] = [];
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const url = await presignGetObject({key: it.fileKey, expiresIn: 60 * 60});
            const inPath = path.join(tmpDir, `in-${i}.mp4`);
            const normPath = path.join(tmpDir, `norm-${i}.mp4`);

            await downloadToFile(url, inPath);

            // v1: config fixe (tu pourras rendre dynamique ensuite)
            await ffmpegNormalizeClip({inPath, outPath: normPath, width: 1080, height: 1920, fps: 30});
            normalizedPaths.push(normPath);

            const pct = 15 + Math.round(((i + 1) / items.length) * 45); // 15 -> 60
            await db.update(exportJobs).set({progress: pct, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));
        }

        // Concat list file
        const listPath = path.join(tmpDir, "concat.txt");
        fs.writeFileSync(
            listPath,
            normalizedPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"),
            "utf8"
        );

        const concatPath = path.join(tmpDir, "concat.mp4");
        await ffmpegConcatFromList({listFilePath: listPath, outPath: concatPath});

        await db.update(exportJobs).set({progress: 75, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));

        // Music optional
        let finalPath = concatPath;
        if (album.musicId) {
            const m = (await db.select().from(musics).where(eq(musics.id, album.musicId)).limit(1))[0];
            if (!m?.fileKey) throw new Error("Music not found");

            const mUrl = await presignGetObject({key: m.fileKey, expiresIn: 60 * 60});
            const mPath = path.join(tmpDir, "music.mp3");
            await downloadToFile(mUrl, mPath);

            const withMusic = path.join(tmpDir, "with-music.mp4");
            await ffmpegAddMusic({videoIn: concatPath, musicIn: mPath, outPath: withMusic});
            finalPath = withMusic;

            await db.update(exportJobs).set({progress: 90, updatedAt: new Date()}).where(eq(exportJobs.id, job.id));
        }

        // Upload to S3
        const finalKey = `${exportKeyBase}.mp4`;
        const buf = fs.readFileSync(finalPath);
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: finalKey,
            Body: buf,
            ContentType: "video/mp4"
        }));

        await db.transaction(async (tx) => {
            await tx.update(exportJobs).set({
                status: "done",
                progress: 100,
                videoKey: finalKey,
                updatedAt: new Date(),
            }).where(eq(exportJobs.id, job.id));

            await tx.update(albums).set({
                status: "exported",
                updatedAt: new Date(),
            }).where(eq(albums.id, album.id));
        });

        return {videoKey: finalKey};
    } catch (e: any) {
        // fail-safe: job already set to error by worker endpoint
        throw e;
    } finally {
        fs.rmSync(tmpDir, {recursive: true, force: true});
    }
}
