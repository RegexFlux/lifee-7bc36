// pages/api/generations/[id]/events.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, asc, eq} from "drizzle-orm";
import {z} from "zod";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {replicateGenerationJobs, replicateGenerationJobEvents} from "@/lib/db/schema";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!id) return fail(res, 400, "Missing id");

        const q = z
            .object({
                limit: z.coerce.number().int().min(1).max(200).default(80),
            })
            .safeParse(req.query);

        if (!q.success) return fail(res, 400, "Invalid query", q.error.flatten());

        const job = (
            await db
                .select({id: replicateGenerationJobs.id})
                .from(replicateGenerationJobs)
                .where(and(eq(replicateGenerationJobs.id, id), eq(replicateGenerationJobs.userId, viewer.user.id)))
                .limit(1)
        )[0];

        if (!job) return fail(res, 404, "Not found");

        const events = await db
            .select()
            .from(replicateGenerationJobEvents)
            .where(eq(replicateGenerationJobEvents.replicateGenerationJobId, id))
            .orderBy(asc(replicateGenerationJobEvents.createdAt))
            .limit(q.data.limit);

        return ok(res, {events});
    },
});
