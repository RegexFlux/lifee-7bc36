// pages/api/lifee/demo/latest.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/security/ip";

import { lifeeIpAttempts } from "@/lib/db/schema";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const ip = getClientIp(req);
    const ipHash = hashIp(ip);

    const scopeKey = "forever";

    const row = await db
        .select()
        .from(lifeeIpAttempts)
        .where(and(eq(lifeeIpAttempts.ipHash, ipHash), eq(lifeeIpAttempts.scopeKey, scopeKey)))
        .limit(1);

    return res.status(200).json({ jobId: row?.[0]?.jobId ?? null });
}
