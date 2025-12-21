import type { NextApiRequest, NextApiResponse } from "next";
import type { TimelineItem } from "@/types/studio";
import { getStore } from "./_store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const store = getStore();

    if (req.method === "PUT") {
        const body = req.body as { timeline?: TimelineItem[] };
        if (!Array.isArray(body.timeline)) return res.status(400).send("Invalid timeline");
        store.timeline = body.timeline;
        return res.status(200).json({ ok: true });
    }

    return res.status(405).send("Method not allowed");
}
