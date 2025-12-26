// File: pages/api/generations/[id]/share.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {generationShares, replicateGenerationJobs} from "@/lib/db/schema";

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const generationId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!generationId) return fail(res, 400, "Missing generation id");

        const job = (
            await db
                .select({id: replicateGenerationJobs.id})
                .from(replicateGenerationJobs)
                .where(and(eq(replicateGenerationJobs.id, generationId), eq(replicateGenerationJobs.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!job) return fail(res, 404, "Not found");

        const existing = (
            await db
                .select()
                .from(generationShares)
                .where(eq(generationShares.generationJobId, generationId))
                .limit(1)
        )[0];

        if (existing) {
            const [updated] = await db
                .update(generationShares)
                .set({isActive: true, revokedAt: null})
                .where(eq(generationShares.id, existing.id))
                .returning();

            return ok(res, {
                share: updated,
                publicPath: `/slug/${generationId}`,
            });
        }

        const [created] = await db
            .insert(generationShares)
            .values({
                generationJobId: generationId,
                userId: viewer.user.id,
                isActive: true,
            })
            .returning();

        return ok(res, {share: created, publicPath: `/slug/${generationId}`}, 201);
    },

    DELETE: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const generationId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!generationId) return fail(res, 400, "Missing generation id");

        const job = (
            await db
                .select({id: replicateGenerationJobs.id})
                .from(replicateGenerationJobs)
                .where(and(eq(replicateGenerationJobs.id, generationId), eq(replicateGenerationJobs.userId, viewer.user.id)))
                .limit(1)
        )[0];
        if (!job) return fail(res, 404, "Not found");

        const existing = (
            await db
                .select()
                .from(generationShares)
                .where(eq(generationShares.generationJobId, generationId))
                .limit(1)
        )[0];

        if (!existing) return ok(res, {status: "ok"});

        const [updated] = await db
            .update(generationShares)
            .set({isActive: false, revokedAt: new Date()})
            .where(eq(generationShares.id, existing.id))
            .returning();

        return ok(res, {share: updated});
    },
});
