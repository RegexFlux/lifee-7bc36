import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { and, desc, eq, isNull, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, emailLoginCodes, lifeeJobs, lifeeJobEvents } from "@/lib/db/schema";
import { getClientIp, hashIp } from "@/lib/security/ip";
import { consumeRateLimitOrThrow } from "@/lib/security/rateLimit";
import { createSessionAndSetCookie } from "@/lib/auth/session";

function normEmail(s: string) {
    return String(s || "").trim().toLowerCase();
}
function sha256(s: string) {
    return crypto.createHash("sha256").update(s).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const email = normEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();
    const jobId = req.body?.jobId ? String(req.body.jobId) : null;

    if (!email || !code) return res.status(400).json({ error: "Missing email/code" });

    // Anti-flood verify (IP + email)
    const ipHash = hashIp(getClientIp(req));
    await consumeRateLimitOrThrow({ key: `auth:verify:ip:${ipHash}`, limit: 20, windowSec: 600 });
    await consumeRateLimitOrThrow({ key: `auth:verify:email:${email}`, limit: 12, windowSec: 600 });

    const now = new Date();

    const rows = await db
        .select()
        .from(emailLoginCodes)
        .where(and(eq(emailLoginCodes.email, email), isNull(emailLoginCodes.usedAt), gt(emailLoginCodes.expiresAt, now)))
        .orderBy(desc(emailLoginCodes.createdAt))
        .limit(1);

    const rec = rows[0];
    if (!rec) return res.status(400).json({ error: "Code invalide ou expiré" });

    if ((rec.attempts as any) >= 5) {
        return res.status(429).json({ error: "Trop d'essais. Redemandez un code." });
    }

    const secret = process.env.AUTH_CODE_SECRET || process.env.IP_HASH_SALT || "secret";
    const expected = sha256(`${email}:${code}:${secret}`);

    if (expected !== rec.codeHash) {
        await db
            .update(emailLoginCodes)
            .set({ attempts: (Number(rec.attempts) || 0) + 1 })
            .where(eq(emailLoginCodes.id, rec.id));
        return res.status(400).json({ error: "Code incorrect" });
    }

    // Mark used
    await db.update(emailLoginCodes).set({ usedAt: now }).where(eq(emailLoginCodes.id, rec.id));

    // Find user
    const u = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = u[0];
    if (!user) return res.status(400).json({ error: "Compte introuvable" });

    // Attach job
    if (jobId) {
        await db.update(lifeeJobs).set({ email, updatedAt: now }).where(eq(lifeeJobs.id, jobId));
        await db.insert(lifeeJobEvents).values({
            id: crypto.randomUUID(),
            jobId,
            type: "info",
            message: `Email associé via verify: ${email}`,
            createdAt: now,
        });
    }

    // Session cookie
    await createSessionAndSetCookie({ userId: user.id, res });

    return res.status(200).json({ authed: true, email });
}
