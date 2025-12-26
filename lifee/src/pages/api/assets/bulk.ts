// File: pages/api/assets/bulk.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {assets} from "@/lib/db/schema";
import {assetThumbnailJobs} from "@/lib/db/schema";
import {zAssetType} from "@/lib/validation/enums";

const zItem = z.object({
    fileKey: z.string().min(1),
    type: zAssetType,
    title: z.string().max(120).optional(),
    month: z.number().int().min(1).max(12).default(1),
    year: z.number().int().min(1900).max(2100).default(2025),
});

const zBody = z.object({
    items: z.array(zItem).min(1).max(50),
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const prefix = `lifee/users/${viewer.user.id}/assets/`;
        for (const it of parsed.data.items) {
            if (!it.fileKey.startsWith(prefix)) return fail(res, 403, "Invalid fileKey in bulk");
        }

        const rows = await db.transaction(async (tx) => {
            const inserted = await tx
                .insert(assets)
                .values(
                    parsed.data.items.map((it) => ({
                        userId: viewer.user.id,
                        type: it.type,
                        fileKey: it.fileKey,
                        title: it.title,
                        month: it.month,
                        year: it.year,
                        thumbnailKey: it.type === "image" ? it.fileKey : null,
                    }))
                )
                .returning();

            const videoUploads = inserted.filter((a) => a.type === "video" && !a.generatedFromAssetId);
            if (videoUploads.length) {
                await tx
                    .insert(assetThumbnailJobs)
                    .values(videoUploads.map((a) => ({userId: viewer.user.id, assetId: a.id})))
                    .onConflictDoNothing();
            }

            return inserted;
        });

        return ok(res, {assets: rows}, 201);
    },
});
