import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { and, desc, eq, isNull, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { appUsers, authEmailCodes } from "@/lib/db/schema.auth";
import { createSession} from "@/pages/api/auth/session";
import { sendLoginCodeEmail, sendWelcomeEmail } from "@/lib/email/send";
import { importJobToLibrary } from "@/lib/studio/importJobToLibrary";

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}
function genCode6() {
    return String(Math.floor(100000 + Math.random() * 900000));
}
function sha256(s: string) {
    return crypto.createHash("sha256").update(s).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as { email?: string; jobId?: string | null };
    const email = normalizeEmail(body?.email || "");
    const jobId = body?.jobId || null;

    if (!email || !email.includes("@")) return res.status(400).json({ error: "Email invalide" });

    // user exists?
    const existing = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);

    // ✅ Nouveau user => création + welcome + session immédiate + import job
    if (!existing.length) {
        const [created] = await db.insert(appUsers).values({ email }).returning();

        // Session immédiate
        await createSession(res, created.id);

        // Import job -> library
        if (jobId) await importJobToLibrary(created.id, jobId);

        // Email bienvenue
        await sendWelcomeEmail(email);

        return res.status(200).json({ mode: "created", authed: true, email });
    }

    // ✅ User existant => envoie code, pas de login ici
    // const code = genCode6();
    const code = '123456';
    console.log('code', code);
    const codeHash = sha256(`${email}:${code}:${process.env.AUTH_CODE_SALT || "salt"}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Anti-spam simple: si un code récent non expiré existe, on refuse ou on renouvelle
    const [last] = await db
        .select()
        .from(authEmailCodes)
        .where(and(eq(authEmailCodes.email, email), isNull(authEmailCodes.consumedAt), gt(authEmailCodes.expiresAt, new Date())))
        .orderBy(desc(authEmailCodes.createdAt))
        .limit(1);

    if (last) {
        // Option: renvoyer le même code => impossible (on ne stocke pas en clair)
        // Donc ici: on autorise un nouveau code mais tu peux rate-limit.
    }

    await db.insert(authEmailCodes).values({
        email,
        codeHash,
        expiresAt,
    });

    await sendLoginCodeEmail(email, code);

    return res.status(200).json({ mode: "code_sent", authed: false, email });
}
