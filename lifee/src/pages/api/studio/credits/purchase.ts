import type { NextApiRequest, NextApiResponse } from "next";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { requireUserId } from "../_auth";
import { appUsers } from "@/lib/db/schema.auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as { amount?: number };
    const amount = Number(body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).send("Invalid amount");

    const [row] = await db
        .update(appUsers)
        .set({ credits: sql`${appUsers.credits} + ${amount}` })
        .where(eq(appUsers.id, userId))
        .returning({ credits: appUsers.credits });

    res.status(200).json({ credits: row?.credits ?? 0 });
}
