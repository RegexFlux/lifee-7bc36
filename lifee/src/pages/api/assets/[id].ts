// pages/api/assets/[id].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, eq} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {assets} from "@/lib/db/schema";

const zPatch = z.object({
    title: z.string().max(120).optional(),
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().min(1900).max(2100).optional(),
});

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!id) return fail(res, 400, "Missing id");

        const row = (
            await db.select().from(assets).where(and(eq(assets.id, id), eq(assets.userId, viewer.user.id))).limit(1)
        )[0];
        if (!row) return fail(res, 404, "Not found");

        return ok(res, {asset: row});
    },

    PATCH: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!id) return fail(res, 400, "Missing id");

        const parsed = zPatch.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const [row] = await db
            .update(assets)
            .set(parsed.data)
            .where(and(eq(assets.id, id), eq(assets.userId, viewer.user.id)))
            .returning();

        if (!row) return fail(res, 404, "Not found");
        return ok(res, {asset: row});
    },

    DELETE: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!id) return fail(res, 400, "Missing id");

        const [row] = await db
            .update(assets)
            .set({deletedAt: new Date()})
            .where(and(eq(assets.id, id), eq(assets.userId, viewer.user.id)))
            .returning();

        if (!row) return fail(res, 404, "Not found");
        return ok(res, {status: "ok"});
    },
});
