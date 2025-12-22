import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

function serializeCookie(name: string, value: string, maxAgeSec: number) {
    const isProd = process.env.NODE_ENV === "production";
    return [
        `${name}=${encodeURIComponent(value)}`,
        `Max-Age=${maxAgeSec}`,
        "Path=/",
        "SameSite=lax",
        "HttpOnly",
        isProd ? "Secure" : "",
    ].filter(Boolean).join("; ");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const jobId = (req.query.jobId as string) || "";

    const state = crypto.randomBytes(16).toString("hex");
    res.setHeader("Set-Cookie", serializeCookie("lifee_oauth_state", state, 10 * 60));

    const redirectUri = `${process.env.APP_URL}/api/auth/google/callback`;
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        prompt: "select_account",
        access_type: "online",
    });

    // on repasse jobId dans l'url callback (non sensible, mais utile)
    if (jobId) params.set("jobId", jobId);

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
