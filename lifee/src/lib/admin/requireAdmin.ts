// src/lib/admin/requireAdmin.ts
import type {NextApiRequest} from "next";

export function requireAdmin(req: NextApiRequest) {
    const expected = process.env.ADMIN_API_KEY;
    if (!expected) throw new Error("Missing ADMIN_API_KEY");

    const got = req.headers["x-admin-key"];
    if (!got || Array.isArray(got) || got !== expected) {
        const err: any = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
}
