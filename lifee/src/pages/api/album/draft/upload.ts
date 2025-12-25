import type {NextApiRequest, NextApiResponse} from "next";
import formidable from "formidable";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import {and, desc, eq, sql} from "drizzle-orm";

import {db} from "@/lib/db";
import {requireUserId} from "@/pages/api/studio/_auth";
import {putFileToS3} from "@/lib/s3";
import {studioAssets} from "@/lib/db/schema.studio";
import {albumDraftItems, albumDrafts} from "@/lib/db/schema.album";

export const config = {api: {bodyParser: false}};

type AnyFormidableFile = formidable.File & { filepath?: string; path?: string };

function pickMany(v: unknown): AnyFormidableFile[] {
    if (!v) return [];
    if (Array.isArray(v)) return v as AnyFormidableFile[];
    return [v as AnyFormidableFile];
}

function getFilePath(f: AnyFormidableFile): string {
    const p = (f.filepath as any) ?? (f.path as any);
    if (!p) throw new Error("Missing temp filepath");
    return String(p);
}

function sanitizeBase(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ ok: true } | { error: string }>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});

    const form = formidable({
        multiples: true,
        keepExtensions: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB / photo (ajuste)
    });

    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(400).json({error: err.message || "Invalid multipart"});
        console.log('received', files);

        try {
            const draftId = String((fields as any).draftId || "");
            if (!draftId) return res.status(400).json({error: "Missing draftId"});

            const [draft] = await db.select().from(albumDrafts).where(and(eq(albumDrafts.id, draftId), eq(albumDrafts.userId, userId)));
            if (!draft) return res.status(404).json({error: "Draft not found"});

            const incoming = [
                ...pickMany(files.files),
            ].filter(Boolean);

            if (incoming.length === 0) return res.status(400).json({error: "No files"});

            const now = new Date();
            const month = now.getMonth() + 1; // 1..12
            const year = now.getFullYear();

            // position base = last position + 1
            const [last] = await db
                .select({
                    pos: sql<number>`coalesce(max(
                    ${albumDraftItems.position}
                    ),
                    -
                    1
                    )`
                })
                .from(albumDraftItems)
                .where(eq(albumDraftItems.draftId, draftId));

            let pos = Number(last?.pos ?? -1) + 1;

            for (const f of incoming) {
                const mime = f.mimetype || "";
                if (!mime.startsWith("image/")) continue;

                const original = sanitizeBase(f.originalFilename || "photo.jpg");
                const ext = path.extname(original) || ".jpg";
                const baseName = original.replace(ext, "") || "photo";
                const rnd = crypto.randomBytes(6).toString("hex");

                const prefix = (process.env.S3_PREFIX || "studio").replace(/^\/|\/$/g, "");
                const fileKey = `${prefix}/${userId}/${Date.now()}-${rnd}-${baseName}${ext}`;
                const thumbKey = `${prefix}/${userId}/${Date.now()}-${rnd}-${baseName}-thumb${ext}`;

                const fp = getFilePath(f);

                try {
                    await putFileToS3({key: fileKey, filePath: fp, contentType: mime});
                    // pour simple: thumbnail = même image (ou tu peux générer un vrai thumb)
                    await putFileToS3({key: thumbKey, filePath: fp, contentType: mime});

                    const [asset] = await db
                        .insert(studioAssets)
                        .values({
                            userId,
                            type: "image",
                            title: baseName.slice(0, 80),
                            month,
                            year,
                            durationSec: null,
                            fileKey,
                            thumbnailKey: thumbKey,
                            isGenerated: false,
                        })
                        .returning({id: studioAssets.id});

                    await db.insert(albumDraftItems).values({
                        draftId,
                        assetId: asset.id,
                        position: pos++,
                    });
                } finally {
                    try {
                        fs.unlinkSync(fp);
                    } catch {
                    }
                }
            }

            await db.update(albumDrafts).set({updatedAt: new Date()}).where(eq(albumDrafts.id, draftId));
            return res.status(200).json({ok: true});
        } catch (e: any) {
            return res.status(500).json({error: e?.message || "Upload failed"});
        }
    });
}
