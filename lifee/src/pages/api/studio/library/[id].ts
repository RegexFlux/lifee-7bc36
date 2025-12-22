import type { NextApiRequest, NextApiResponse } from "next";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireUserId } from "../_auth";
import { studioAssets } from "@/lib/db/schema.studio";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const assetId = req.query.id as string;
    if (req.method !== "DELETE") return res.status(405).send("Method not allowed");

    // ✅ ownership check
    const [asset] = await db
        .select({ id: studioAssets.id })
        .from(studioAssets)
        .where(and(eq(studioAssets.id, assetId), eq(studioAssets.userId, userId)));

    if (!asset) return res.status(404).send("Not found");

    await db.delete(studioAssets).where(and(eq(studioAssets.id, assetId), eq(studioAssets.userId, userId)));
    return res.status(200).json({ ok: true });
}
