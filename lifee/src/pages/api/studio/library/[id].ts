import type { NextApiRequest, NextApiResponse } from "next";
import { getStore } from "../_store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const store = getStore();
    const id = parseInt(req.query.id as string, 10);
    if (!Number.isFinite(id)) return res.status(400).send("Invalid id");

    if (req.method === "DELETE") {
        store.library = store.library.filter((a) => a.id !== id);
        // Option: aussi retirer de timeline les items qui pointent sur cet asset
        store.timeline = store.timeline.filter((t) => t.id !== id);
        return res.status(200).json({ ok: true });
    }

    return res.status(405).send("Method not allowed");
}
