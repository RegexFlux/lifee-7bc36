import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { lifeeJobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

function appUrl(req: NextApiRequest) {
    const u = process.env.APP_URL;
    if (u) return u.replace(/\/$/, "");
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return `${proto}://${host}`;
}

function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { to, jobId } = (req.body || {}) as { to?: string; jobId?: string };

    if (!to || !isEmail(to)) return res.status(400).json({ error: "Invalid email" });
    if (!jobId) return res.status(400).json({ error: "Missing jobId" });

    const from = process.env.EMAIL_FROM;
    if (!from) return res.status(500).json({ error: "Missing EMAIL_FROM" });
    if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: "Missing RESEND_API_KEY" });

    const rows = await db.select().from(lifeeJobs).where(eq(lifeeJobs.id, jobId)).limit(1);
    const job = rows?.[0];
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.shareSlug) return res.status(400).json({ error: "Share not available" });

    const shareUrl = `${appUrl(req)}/v/${job.shareSlug}`;

    try {
        await resend.emails.send({
            from,
            to,
            subject: "Votre vidéo Lifee est prête ✨",
            text: `Voici votre lien Lifee : ${shareUrl}\n\nÀ très vite,\nLifee`,
        });
        return res.status(200).json({ ok: true });
    } catch (e: any) {
        return res.status(500).json({ error: e?.message || "Email send failed" });
    }
}
