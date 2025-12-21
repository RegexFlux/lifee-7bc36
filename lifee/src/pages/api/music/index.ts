// pages/api/music.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // Liste prédéfinie côté serveur (DB, config, etc.)
    const presets = [
        { id: "m1", title: "Cinematic Ambient", duration: "2:30", genre: "Cinematic" },
        { id: "m2", title: "Corporate Upbeat", duration: "1:45", genre: "Business" },
        { id: "m3", title: "Emotional Piano", duration: "3:10", genre: "Drama" },
        { id: "m4", title: "Tech Future", duration: "2:15", genre: "Electronic" },
    ];
    res.status(200).json(presets);
}
