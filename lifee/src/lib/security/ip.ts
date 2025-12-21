import type { NextApiRequest } from "next";
import crypto from "node:crypto";

export function getClientIp(req: NextApiRequest) {
    const xf = req.headers["x-forwarded-for"];
    const ip =
        (typeof xf === "string" ? xf.split(",")[0]?.trim() : undefined) ||
        req.socket.remoteAddress ||
        "0.0.0.0";
    return ip;
}

export function hashIp(ip: string) {
    const salt = process.env.IP_HASH_SALT || "salt";
    return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function dayKeyUTC(d = new Date()) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
