// pages/api/assets/[id]/url.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, isNull} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {assets} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!id) return fail(res, 400, "Missing id");

        const row = (
            await db
                .select()
                .from(assets)
                .where(and(eq(assets.id, id), eq(assets.userId, viewer.user.id), isNull(assets.deletedAt)))
                .limit(1)
        )[0];

        if (!row) return fail(res, 404, "Not found");

        if (row.type === 'video' && row.generatedFromAssetId) {
            const source = (
                await db
                    .select()
                    .from(assets)
                    .where(and(eq(assets.id, row.generatedFromAssetId), eq(assets.userId, viewer.user.id), isNull(assets.deletedAt)))
                    .limit(1)
            )[0];

            if (source) {
                row.thumbnailKey = source.fileKey;
            }
        }

        const url = await presignGetObject({key: row.fileKey, expiresIn: 60 * 15});
        const thumbnailUrl = row.thumbnailKey ? await presignGetObject({
            key: row.thumbnailKey,
            expiresIn: 60 * 15
        }) : null;

        return ok(res, {url, thumbnailUrl, expiresInSec: 60 * 15});
    },
});
