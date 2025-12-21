import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { lifeeJobs, lifeeJobEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

function isEmail(s: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const jobId = String(req.query.jobId || "");
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email || !isEmail(email)) return res.status(400).json({ error: "Invalid email" });

    const job = await db.query.lifeeJobs.findFirst({ where: eq(lifeeJobs.id, jobId) });
    if (!job) return res.status(404).json({ error: "Not found" });

    await db.update(lifeeJobs).set({ email, updatedAt: new Date() }).where(eq(lifeeJobs.id, jobId));
    await db.insert(lifeeJobEvents).values({
        id: crypto.randomUUID(),
        jobId,
        type: "info",
        message: `Email associé: ${email}`,
        createdAt: new Date(),
    });

    return res.status(200).json({ ok: true });
}
