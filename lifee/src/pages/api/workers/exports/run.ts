// pages/api/workers/exports/run.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {eq, sql} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {exportJobs} from "@/lib/db/schema";
import {renderAlbumExport} from "@/lib/exports/renderAlbumExport";

function requireWorkerSecret(req: NextApiRequest) {
    const expected = process.env.WORKER_SECRET;
    const got = req.headers["x-worker-secret"];
    if (!expected) throw new Error("Missing WORKER_SECRET");
    if (!got || Array.isArray(got) || got !== expected) {
        const err: any = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
}

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        requireWorkerSecret(req);

        const jobId = (req.body?.jobId as string | undefined)?.trim() || null;

        // 1) Claim job (queued -> rendering)
        const claimed = await db.transaction(async (tx) => {
            if (jobId) {
                // Claim spécifique
                const r = await tx.execute(sql`
                    UPDATE "export_jobs"
                    SET "status"     = 'rendering',
                        "progress"   = 1,
                        "updated_at" = now()
                    WHERE "id" = ${jobId}
                      AND "status" = 'queued' RETURNING "id"
                `);
                // @ts-ignore driver-dependent
                const rows = r?.rows ?? [];
                if (!rows.length) return null;
                return jobId;
            }

            // Claim automatique (plus ancien queued)
            const r = await tx.execute(sql`
                WITH cte AS (SELECT "id"
                             FROM "export_jobs"
                             WHERE "status" = 'queued'
                             ORDER BY "created_at" ASC
                    FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
                UPDATE "export_jobs"
                SET "status"     = 'rendering',
                    "progress"   = 1,
                    "updated_at" = now() FROM cte
                WHERE "export_jobs"."id" = cte."id"
                    RETURNING "export_jobs"."id"
            `);
            // @ts-ignore driver-dependent
            const rows = r?.rows ?? [];
            return rows[0]?.id ?? null;
        });

        if (!claimed) return ok(res, {status: "idle"});

        // 2) Execute render
        try {
            const result = await renderAlbumExport({exportJobId: claimed});

            return ok(res, {
                status: "ok",
                exportJobId: claimed,
                videoKey: result.videoKey,
            });
        } catch (e: any) {
            // Mark error
            await db.update(exportJobs).set({
                status: "error",
                errorMessage: e?.message || "Export failed",
                updatedAt: new Date(),
            }).where(eq(exportJobs.id, claimed));

            return fail(res, 500, e?.message || "Export failed");
        }
    },
});
