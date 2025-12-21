import type { NextApiRequest, NextApiResponse } from "next";
import { getStore } from "../_store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const store = getStore();
    const jobId = req.query.jobId as string;
    const job = store.exportJobs[jobId];

    if (!job) return res.status(404).send("Job not found");

    return res.status(200).json({
        status: job.status,
        progress: job.progress,
        url: job.url,
    });
}
