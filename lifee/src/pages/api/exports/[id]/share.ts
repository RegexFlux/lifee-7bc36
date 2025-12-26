// pages/api/exports/[id]/share.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {exportJobs, exportShares} from "@/lib/db/schema";

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const exportJobId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!exportJobId) return fail(res, 400, "Missing export job id");

        const job = (
            await db
                .select({id: exportJobs.id})
                .from(exportJobs)
                .where(and(eq(exportJobs.id, exportJobId), eq(exportJobs.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!job) return fail(res, 404, "Not found");

        const existing = (
            await db
                .select()
                .from(exportShares)
                .where(eq(exportShares.exportJobId, exportJobId))
                .limit(1)
        )[0];

        if (existing) {
            const [updated] = await db
                .update(exportShares)
                .set({isActive: true, revokedAt: null})
                .where(eq(exportShares.id, existing.id))
                .returning();

            return ok(res, {share: updated, publicPath: `/share/exports/${updated.id}`});
        }

        const [created] = await db
            .insert(exportShares)
            .values({
                exportJobId,
                userId: viewer.user.id,
                isActive: true,
            })
            .returning();

        return ok(res, {share: created, publicPath: `/share/exports/${created.id}`}, 201);
    },

    DELETE: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const exportJobId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!exportJobId) return fail(res, 400, "Missing export job id");

        const job = (
            await db
                .select({id: exportJobs.id})
                .from(exportJobs)
                .where(and(eq(exportJobs.id, exportJobId), eq(exportJobs.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!job) return fail(res, 404, "Not found");

        const existing = (
            await db
                .select()
                .from(exportShares)
                .where(eq(exportShares.exportJobId, exportJobId))
                .limit(1)
        )[0];

        if (!existing) return ok(res, {status: "ok"});

        const [updated] = await db
            .update(exportShares)
            .set({isActive: false, revokedAt: new Date()})
            .where(eq(exportShares.id, existing.id))
            .returning();

        return ok(res, {share: updated});
    },
});
