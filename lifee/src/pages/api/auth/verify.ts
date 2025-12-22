import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { and, desc, eq, isNull, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appUsers, authEmailCodes } from "@/lib/db/schema.auth";
import { createSession} from "@/pages/api/auth/session";
import { importJobToLibrary } from "@/lib/studio/importJobToLibrary";

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}
function sha256(s: string) {
    return crypto.createHash("sha256").update(s).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as { email?: string; code?: string; jobId?: string | null };
    const email = normalizeEmail(body?.email || "");
    const code = String(body?.code || "").replace(/\D/g, "").slice(0, 6);
    const jobId = body?.jobId || null;

    if (!email || !code || code.length !== 6) return res.status(400).json({ error: "Données invalides" });

    const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);
    if (!user) return res.status(404).json({ error: "Compte introuvable" });

    const now = new Date();

    // prend le code le plus récent non consommé
    const [row] = await db
        .select()
        .from(authEmailCodes)
        .where(and(eq(authEmailCodes.email, email), isNull(authEmailCodes.consumedAt), gt(authEmailCodes.expiresAt, now)))
        .orderBy(desc(authEmailCodes.createdAt))
        .limit(1);

    if (!row) return res.status(400).json({ error: "Code expiré ou invalide" });

    // max attempts
    if ((row.attempts ?? 0) >= 5) return res.status(429).json({ error: "Trop de tentatives. Recommence." });

    const expected = sha256(`${email}:${code}:${process.env.AUTH_CODE_SALT || "salt"}`);
    if (row.codeHash !== expected) {
        await db
            .update(authEmailCodes)
            .set({ attempts: sql`${authEmailCodes.attempts} + 1` })
            .where(eq(authEmailCodes.id, row.id));
        return res.status(400).json({ error: "Code invalide" });
    }

    // consume code
    await db.update(authEmailCodes).set({ consumedAt: now }).where(eq(authEmailCodes.id, row.id));

    // create session
    await createSession(res, user.id);

    // import jobId -> library (si fourni)
    if (jobId) await importJobToLibrary(user.id, jobId);

    return res.status(200).json({ ok: true });
}
