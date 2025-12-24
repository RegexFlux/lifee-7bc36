// pages/api/studio/export/[id].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";

import {db} from "@/lib/db";
import {requireUserId} from "../_auth";
import {exportJobs} from "@/lib/db/schema.studio";

type ExportStatusOk = {
    status: "queued" | "rendering" | "done" | "error";
    progress: number;
    url?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ExportStatusOk | { error: string }>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "GET") return res.status(405).json({error: "Method not allowed"});

    const jobId = String(req.query.jobId || "");
    if (!jobId) return res.status(400).json({error: "Missing job id"});

    const [job] = await db
        .select({status: exportJobs.status, progress: exportJobs.progress, url: exportJobs.url})
        .from(exportJobs)
        .where(and(eq(exportJobs.id, jobId), eq(exportJobs.userId, userId)));

    if (!job) return res.status(404).json({error: "Not found"});

    return res.status(200).json({
        status: job.status as ExportStatusOk["status"],
        progress: job.progress ?? 0,
        url: job.url ?? undefined,
    });
}
