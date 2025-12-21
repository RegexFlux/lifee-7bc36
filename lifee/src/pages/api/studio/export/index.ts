import type { NextApiRequest, NextApiResponse } from "next";
import type { TimelineItem } from "@/types/studio";
import { getStore } from "../_store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const store = getStore();

    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as { timeline: TimelineItem[]; musicId?: string | null };
    if (!Array.isArray(body.timeline)) return res.status(400).send("Invalid timeline");

    const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    store.exportJobs[jobId] = {
        status: "queued" as const,
        progress: 0,
        url: undefined as string | undefined,
        startedAt: Date.now(),
    };

    // Simule un rendu
    setTimeout(() => {
        const job = store.exportJobs[jobId];
        if (!job) return;
        job.status = "rendering";
        job.progress = 10;

        const interval = setInterval(() => {
            const j = store.exportJobs[jobId];
            if (!j) return clearInterval(interval);

            j.progress = Math.min(100, j.progress + 18);

            if (j.progress >= 100) {
                j.status = "done";
                j.url = "/fake/video.mp4"; // remplace par ton URL de rendu
                clearInterval(interval);
            }
        }, 600);
    }, 200);

    return res.status(200).json({ jobId });
}
