// pages/api/auth/me.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {getOrCreateViewer} from "@/lib/auth/viewer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({error: "Method not allowed"});

    const viewer = await getOrCreateViewer(req, res);
    return res.status(200).json({
        user: viewer.user,
        session: {id: viewer.sessionId, isNew: viewer.isNewSession},
    });
}
