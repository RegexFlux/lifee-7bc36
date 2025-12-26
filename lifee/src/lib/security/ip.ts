// src/lib/security/ip.ts
import type {NextApiRequest} from "next";
import crypto from "crypto";

export function getClientIp(req: NextApiRequest) {
    const xff = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
    const xrip = (req.headers["x-real-ip"] as string | undefined)?.trim();
    return xff || xrip || req.socket.remoteAddress || "0.0.0.0";
}

export function hashIp(ip: string) {
    const secret = process.env.IP_HASH_SECRET || "lifee-dev";
    return crypto.createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}
