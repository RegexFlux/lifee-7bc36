import type { NextApiRequest, NextApiResponse } from "next";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireUserId } from "../_auth";
import { exportJobs } from "@/lib/db/schema.studio";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const jobId = req.query.jobId as string;

    const [job] = await db
        .select({ status: exportJobs.status, progress: exportJobs.progress, url: exportJobs.url })
        .from(exportJobs)
        .where(and(eq(exportJobs.id, jobId), eq(exportJobs.userId, userId)));

    if (!job) return res.status(404).send("Not found");

    res.status(200).json({
        status: job.status as "queued" | "rendering" | "done" | "error",
        progress: job.progress ?? 0,
        url: job.url ?? undefined,
    });
}
