import crypto from "node:crypto";
import type { NextApiResponse } from "next";
import { db } from "@/lib/db/index";
import { sessions } from "@/lib/db/schema";

function sha256(s: string) {
    return crypto.createHash("sha256").update(s).digest("hex");
}

export async function createSessionAndSetCookie(params: {
    userId: string;
    res: NextApiResponse;
}) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(token);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30j

    await db.insert(sessions).values({
        id: crypto.randomUUID(),
        userId: params.userId,
        tokenHash,
        createdAt: now,
        expiresAt,
    });

    const secure = process.env.NODE_ENV === "production";
    const cookie = [
        `lifee_session=${token}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        secure ? "Secure" : "",
        `Max-Age=${60 * 60 * 24 * 30}`,
    ]
        .filter(Boolean)
        .join("; ");

    params.res.setHeader("Set-Cookie", cookie);
}
