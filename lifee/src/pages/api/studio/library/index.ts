import type { NextApiRequest, NextApiResponse } from "next";
import type { Asset } from "@/types/studio";
import { getStore } from "../_store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const store = getStore();

    if (req.method === "POST") {
        const body = req.body as Partial<Asset> & {
            date: string;
            title: string;
            type: "image" | "video";
        };

        if (!body.title || !body.type || !body.date) {
            return res.status(400).send("Missing fields");
        }

        const asset: Asset = {
            id: Date.now(),
            title: body.title,
            type: body.type,
            date: body.date,
            duration: body.type === "video" ? body.duration : undefined,
            thumbnailUrl: body.thumbnailUrl,
        };

        store.library.unshift(asset);
        return res.status(200).json(asset);
    }

    return res.status(405).send("Method not allowed");
}
