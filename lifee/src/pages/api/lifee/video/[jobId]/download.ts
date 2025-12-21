import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { lifeeJobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { presignGet } from "@/lib/s3";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const jobId = String(req.query.jobId || "");
    const job = await db.query.lifeeJobs.findFirst({ where: eq(lifeeJobs.id, jobId) });
    if (!job || job.status !== "succeeded" || !job.videoKey) return res.status(404).end();

    const url = await presignGet(job.videoKey, 120);
    res.writeHead(302, { Location: url });
    res.end();
}
