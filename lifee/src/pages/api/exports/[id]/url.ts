// pages/api/exports/[id]/url.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db/index";
import {exportJobs} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!id) return fail(res, 400, "Missing export id");

        const job = (
            await db
                .select()
                .from(exportJobs)
                .where(and(eq(exportJobs.id, id), eq(exportJobs.userId, viewer.user.id)))
                .limit(1)
        )[0];

        if (!job) return fail(res, 404, "Not found");
        if (job.status !== "done" || !job.videoKey) return fail(res, 409, "Export not ready");

        const expiresInSec = 60 * 15;
        const url = await presignGetObject({key: job.videoKey, expiresIn: expiresInSec});

        return ok(res, {url, expiresInSec});
    },
});
