import type { NextApiRequest, NextApiResponse } from "next";
import {clearSessionCookie} from "@/pages/api/auth/session";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
}
