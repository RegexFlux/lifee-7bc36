import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, emailLoginCodes, lifeeJobs, lifeeJobEvents } from "@/lib/db/schema";
import { getClientIp, hashIp } from "@/lib/security/ip";
import { consumeRateLimitOrThrow } from "@/lib/security/rateLimit";
import { createSessionAndSetCookie } from "@/lib/auth/session";
import { sendLoginCodeEmail } from "@/lib/email/sendLoginCode";

function normEmail(s: string) {
    return String(s || "").trim().toLowerCase();
}
function isEmail(s: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function sha256(s: string) {
    return crypto.createHash("sha256").update(s).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const email = normEmail(req.body?.email);
    const jobId = req.body?.jobId ? String(req.body.jobId) : null;

    if (!email || !isEmail(email)) return res.status(400).json({ error: "Invalid email" });

    // Anti-flood (IP + email)
    const ipHash = hashIp(getClientIp(req));
    await consumeRateLimitOrThrow({ key: `auth:start:ip:${ipHash}`, limit: 10, windowSec: 3600 });
    await consumeRateLimitOrThrow({ key: `auth:start:email:${email}`, limit: 5, windowSec: 3600 });

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = existing[0] ?? null;

    // Assoc job -> email (best effort)
    async function attachJob() {
        if (!jobId) return;
        await db.update(lifeeJobs).set({ email, updatedAt: new Date() }).where(eq(lifeeJobs.id, jobId));
        await db.insert(lifeeJobEvents).values({
            id: crypto.randomUUID(),
            jobId,
            type: "info",
            message: `Email associé via auth: ${email}`,
            createdAt: new Date(),
        });
    }

    // 1) New user => auto create + auto login (comme demandé)
    if (!user) {
        const userId = crypto.randomUUID();

        await db.insert(users).values({
            id: userId,
            email,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await attachJob();
        await createSessionAndSetCookie({ userId, res });

        return res.status(200).json({
            mode: "created",
            authed: true,
            email,
        });
    }

    // 2) Existing user => send code by email
    await consumeRateLimitOrThrow({ key: `auth:code_send:email:${email}`, limit: 3, windowSec: 15 * 60 });

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const secret = process.env.AUTH_CODE_SECRET || process.env.IP_HASH_SALT || "secret";
    const codeHash = sha256(`${email}:${code}:${secret}`);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    await db.insert(emailLoginCodes).values({
        id: crypto.randomUUID(),
        email,
        codeHash,
        createdAt: now,
        expiresAt,
        attempts: 0,
    });

    await attachJob();
    await sendLoginCodeEmail({ email, code });

    return res.status(200).json({
        mode: "code_sent",
        authed: false,
        email,
    });
}
