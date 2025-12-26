// src/lib/auth/require.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {getOrCreateViewer} from "@/lib/auth/getOrCreateViewer";

export async function requireViewer(req: NextApiRequest, res: NextApiResponse) {
    return getOrCreateViewer(req, res);
}

export async function requireNormalUser(req: NextApiRequest, res: NextApiResponse) {
    const viewer = await getOrCreateViewer(req, res);
    if (viewer.user.type !== "user") {
        const err: any = new Error("Auth required");
        err.status = 401;
        throw err;
    }
    return viewer;
}
