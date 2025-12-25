import type {NextApiRequest, NextApiResponse} from "next";
import crypto from "node:crypto";
import {db} from "@/lib/db";
import {sessions} from "@/lib/db/schema"; // ton schema sessions
import {appUsers} from "@/lib/db/schema.auth";
import {eq} from "drizzle-orm";

// ⚠️ npm i cookie si tu ne l'as pas
import {serialize} from "cookie";
import {COOKIE_NAME, createSession} from "@/pages/api/auth/session";
import {albumDraftItems} from "@/lib/db/schema.album";

function sha256(s: string) {
    return crypto.createHash("sha256").update(s).digest("hex");
}

function getCookie(req: NextApiRequest, name: string) {
    const raw = req.headers.cookie || "";
    const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const cookieName = COOKIE_NAME;

    // déjà une session ? -> ok
    const existingToken = getCookie(req, cookieName);
    if (existingToken) return res.status(200).json({ok: true});

    // 1) créer user "guest" (email null) + crédits 0
    const userId = crypto.randomUUID();
    await db.insert(appUsers).values({
        id: userId,
        email: `guest+${crypto.randomUUID()}@lifee.invalid`,          // IMPORTANT: email nullable
        credits: 0,
        // optionnel: isGuest: true
    }).onConflictDoNothing();

    // 2) créer session token
    await createSession(res, userId);

    return res.status(200).json({mode: "created", authed: true});
}
