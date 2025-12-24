import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import {and, desc, eq} from "drizzle-orm";

import { db } from "@/lib/db";
import { lifeeIpAttempts, lifeeJobs } from "@/lib/db/schema";
import { presignGet } from "@/lib/s3";

function getClientIp(req: NextApiRequest) {
    const xf = req.headers["x-forwarded-for"];
    const raw = Array.isArray(xf) ? xf[0] : xf;
    const ip = raw?.split(",")?.[0]?.trim() || req.socket.remoteAddress || "0.0.0.0";
    return ip;
}

function hashIp(ip: string) {
    const salt = process.env.IP_HASH_SALT || "dev-salt";
    return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function parisDayKey(d = new Date()) {
    const parts = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Europe/Paris",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value ?? "0000";
    const m = parts.find((p) => p.type === "month")?.value ?? "00";
    const day = parts.find((p) => p.type === "day")?.value ?? "00";
    return `${y}-${m}-${day}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const mode = String(req.query.mode || "day"); // day | forever
    const ipHash = hashIp(getClientIp(req));
    const scopeKey = mode === "forever" ? "forever" : parisDayKey();

    const row = await db
        .select()
        .from(lifeeIpAttempts)
        .where(and(eq(lifeeIpAttempts.ipHash, ipHash), eq(lifeeIpAttempts.scopeKey, scopeKey)))
        .orderBy(desc(lifeeIpAttempts.createdAt))
        .limit(1);

    const jobId = row?.[0]?.jobId;
    if (!jobId) return res.status(404).json({ error: "No recent job" });

    const job = await db.select().from(lifeeJobs).where(eq(lifeeJobs.id, jobId)).limit(1);
    if (!job?.[0]) return res.status(404).json({ error: "Job not found" });

    const j = job[0];

    let videoUrl: string | null = null;
    if (j.videoKey) videoUrl = await presignGet(j.videoKey);
    else if (j.replicateOutputUrl) videoUrl = j.replicateOutputUrl;

    return res.status(200).json({
        jobId: j.id,
        status: j.status,
        videoUrl,
        shareUrl: j.shareSlug ? `${process.env.APP_URL?.replace(/\/$/, "")}/v/${j.shareSlug}` : null,
    });
}
