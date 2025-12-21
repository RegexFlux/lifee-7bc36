import type { NextApiRequest, NextApiResponse } from "next";
import type { Asset } from "@/types/studio";
import { getStore } from "./_store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const store = getStore();

    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as { sourceAssetId: number; durationSec: number; prompt: string };
    if (!body?.sourceAssetId || !body?.durationSec) return res.status(400).send("Missing fields");

    if (store.credits <= 0) return res.status(402).send("No credits");

    const source = store.library.find((a) => a.id === body.sourceAssetId);
    if (!source) return res.status(404).send("Source asset not found");

    store.credits -= 1;

    const generated: Asset & { context: string; isGenerated: true } = {
        id: Date.now(),
        type: "video",
        title: `${source.title} (AI)`,
        date: source.date,
        duration: `${body.durationSec}s`,
        thumbnailUrl: source.thumbnailUrl,
        context: body.prompt || "AI",
        isGenerated: true,
    };

    // On ajoute à la bibliothèque
    store.library.unshift(generated);

    return res.status(200).json(generated);
}
