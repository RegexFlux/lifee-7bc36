// File: pages/api/assets/index.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, desc, eq, isNull} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {assets} from "@/lib/db/schema";
import {assetThumbnailJobs} from "@/lib/db/schema";
import {zAssetType} from "@/lib/validation/enums";

const zCreate = z.object({
    fileKey: z.string().min(1),
    type: zAssetType,
    title: z.string().max(120).optional(),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1900).max(2100),
    generatedFromAssetId: z.string().uuid().optional(),
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const parsed = zCreate.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const prefix = `lifee/users/${viewer.user.id}/assets/`;
        if (!parsed.data.fileKey.startsWith(prefix)) return fail(res, 403, "Invalid fileKey");

        // --- thumbnailKey rules ---
        let thumbnailKey: string | null = null;

        if (parsed.data.type === "image") {
            // photos: thumbnailKey = fileKey
            thumbnailKey = parsed.data.fileKey;
        }

        if (parsed.data.type === "video" && parsed.data.generatedFromAssetId) {
            // vidéos générées: thumbnailKey = generatedFromAsset.fileKey
            const src = (
                await db
                    .select({fileKey: assets.fileKey})
                    .from(assets)
                    .where(and(eq(assets.id, parsed.data.generatedFromAssetId), eq(assets.userId, viewer.user.id), isNull(assets.deletedAt)))
                    .limit(1)
            )[0];

            if (!src) return fail(res, 404, "generatedFromAsset not found");
            thumbnailKey = src.fileKey;
        }

        const [row] = await db
            .insert(assets)
            .values({
                userId: viewer.user.id,
                type: parsed.data.type,
                fileKey: parsed.data.fileKey,
                title: parsed.data.title,
                month: parsed.data.month,
                year: parsed.data.year,
                generatedFromAssetId: parsed.data.generatedFromAssetId,
                thumbnailKey,
            })
            .returning();

        // Vidéo uploadée => job thumbnail
        if (row.type === "video" && !row.generatedFromAssetId) {
            await db
                .insert(assetThumbnailJobs)
                .values({userId: viewer.user.id, assetId: row.id})
                .onConflictDoNothing();
        }

        return ok(res, {asset: row}, 201);
    },

    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const q = z
            .object({
                type: zAssetType.optional(),
                year: z.coerce.number().int().optional(),
                month: z.coerce.number().int().optional(),
                cursor: z.string().uuid().optional(),
                limit: z.coerce.number().int().min(1).max(50).default(24),
                includeDeleted: z.coerce.boolean().optional(),
            })
            .safeParse(req.query);

        if (!q.success) return fail(res, 400, "Invalid query", q.error.flatten());

        const {type, year, month, limit, includeDeleted} = q.data;

        const whereParts: any[] = [eq(assets.userId, viewer.user.id)];
        if (!includeDeleted) whereParts.push(isNull(assets.deletedAt));
        if (type) whereParts.push(eq(assets.type, type));
        if (year) whereParts.push(eq(assets.year, year));
        if (month) whereParts.push(eq(assets.month, month));

        const rows = await db
            .select()
            .from(assets)
            .where(and(...whereParts))
            .orderBy(desc(assets.year), desc(assets.month), desc(assets.createdAt))
            .limit(limit);

        return ok(res, {assets: rows});
    },
});
