// pages/api/studio/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { requireUserId } from "../_auth";
import { putFileToS3, loadS3Env } from "@/lib/s3";

export const config = { api: { bodyParser: false } };

type AnyFormidableFile = formidable.File & { filepath?: string; path?: string };

function pickOne(v: unknown): AnyFormidableFile | null {
    if (!v) return null;
    if (Array.isArray(v)) return (v[0] as AnyFormidableFile) ?? null;
    return v as AnyFormidableFile;
}

function getFilePath(f: AnyFormidableFile): string {
    // formidable v2/v3 => filepath, v1 => path
    const p = (f.filepath as string | undefined) ?? (f.path as string | undefined);
    if (!p) throw new Error("Upload: missing temp filepath (formidable file has no filepath/path)");
    return p;
}

function sanitizeBase(name: string) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9.\-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function publicUrlFromKey(key: string) {
    const { bucket } = loadS3Env();
    const base = (process.env.S3_PUBLIC_BASE_URL || process.env.S3_ENDPOINT || "").replace(/\/$/, "");
    if (!base) return key; // si privé, renvoie la key (tu presign au bootstrap)
    return `${base}/${bucket}/${key}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const form = formidable({
        multiples: false,
        keepExtensions: true,
        maxFileSize: 400 * 1024 * 1024,
    });

    form.parse(req, async (err, _fields, files) => {
        if (err) return res.status(400).send(`Upload error: ${err.message || "invalid multipart"}`);

        const file = pickOne((files as any).file);
        if (!file) return res.status(400).send("Missing file (field name must be 'file')");

        const thumb = pickOne((files as any).thumbnail);

        const now = Date.now();
        const rnd = crypto.randomBytes(6).toString("hex");

        const originalName = sanitizeBase(file.originalFilename || "file");
        const ext = path.extname(originalName) || "";
        const baseName = originalName.replace(ext, "") || "file";

        const prefix = (process.env.S3_PREFIX || "studio").replace(/^\/|\/$/g, "");
        const fileKey = `${prefix}/${userId}/${now}-${rnd}-${baseName}${ext}`;

        const filePath = getFilePath(file);
        const contentType = file.mimetype || "application/octet-stream";

        let thumbKey: string | null = null;
        const thumbPath = thumb ? getFilePath(thumb) : null;

        try {
            await putFileToS3({ key: fileKey, filePath, contentType });

            if (thumb && thumbPath) {
                const tName = sanitizeBase(thumb.originalFilename || "thumb.jpg");
                const tExt = path.extname(tName) || ".jpg";
                thumbKey = `${prefix}/${userId}/${now}-${rnd}-thumb${tExt}`;

                await putFileToS3({
                    key: thumbKey,
                    filePath: thumbPath,
                    contentType: thumb.mimetype || "image/jpeg",
                });
            }

            return res.status(200).json({
                fileKey: fileKey,
                fileUrl: publicUrlFromKey(fileKey),
                thumbnailKey: thumbKey,
                thumbnailUrl: thumbKey ? publicUrlFromKey(thumbKey) : undefined,
            });
        } catch (e: any) {
            return res.status(500).send(e?.message || "S3 upload failed");
        } finally {
            try { fs.unlinkSync(filePath); } catch {}
            if (thumbPath) {
                try { fs.unlinkSync(thumbPath); } catch {}
            }
        }
    });
}
