import type { NextApiRequest, NextApiResponse } from "next";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { appUsers, oauthAccounts } from "@/lib/db/schema.auth";
import { createSession} from "@/pages/api/auth/session";
import { importJobToLibrary } from "@/lib/studio/importJobToLibrary";
import { sendWelcomeEmail } from "@/lib/email/send";

function getCookie(req: NextApiRequest, name: string) {
    const raw = req.headers.cookie || "";
    const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1] || "") : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const jobId = String(req.query.jobId || "");

    const stateCookie = getCookie(req, "lifee_oauth_state");
    if (!stateCookie || stateCookie !== state) return res.status(400).send("Invalid state");

    const redirectUri = `${process.env.APP_URL}/api/auth/google/callback`;

    // 1) exchange code -> tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) return res.status(400).send("Token exchange failed");

    const accessToken = tokenJson.access_token as string | undefined;
    if (!accessToken) return res.status(400).send("No access token");

    // 2) userinfo
    const uRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const u = await uRes.json();
    if (!uRes.ok) return res.status(400).send("Userinfo failed");

    const email = String(u.email || "").toLowerCase();
    const sub = String(u.sub || "");

    if (!email || !sub) return res.status(400).send("Missing email/sub");

    // 3) find user by oauth account
    const [acc] = await db
        .select()
        .from(oauthAccounts)
        .where(and(eq(oauthAccounts.provider, "google"), eq(oauthAccounts.providerAccountId, sub)))
        .limit(1);

    let userId: string;

    if (acc) {
        userId = acc.userId;
    } else {
        // fallback: find by email
        const [existing] = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);

        if (existing) {
            userId = existing.id;
        } else {
            const [created] = await db.insert(appUsers).values({ email }).returning();
            userId = created.id;
            await sendWelcomeEmail(email);
        }

        // link oauth
        await db.insert(oauthAccounts).values({
            provider: "google",
            providerAccountId: sub,
            userId,
        });
    }

    // 4) session + import job
    await createSession(res, userId);
    if (jobId) await importJobToLibrary(userId, jobId);

    // redirect studio
    res.redirect("/studio");
}
