import type { NextApiRequest, NextApiResponse } from "next";
import type { StudioBootstrap } from "@/types/studio";

import { getStore } from "./_store";

export default function handler(req: NextApiRequest, res: NextApiResponse<StudioBootstrap>) {
    const store = getStore();
    res.status(200).json({
        credits: store.credits,
        library: store.library,
        timeline: store.timeline,
        musicPresets: store.musicPresets,
    });
}
