// pages/api/admin/musics/[id].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {eq} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireAdmin} from "@/lib/admin/requireAdmin";
import {db} from "@/lib/db";
import {musics} from "@/lib/db/schema";

const zBody = z.object({
    title: z.string().min(1).optional(),
    artist: z.string().optional(),
    durationSec: z.number().int().positive().optional(),
    waveformKey: z.string().optional(),
    isActive: z.boolean().optional(),
});

export default apiHandler({
    PATCH: async (req: NextApiRequest, res: NextApiResponse) => {
        requireAdmin(req);

        const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!id) return fail(res, 400, "Missing id");

        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const patch = parsed.data;
        const [row] = await db.update(musics).set(patch).where(eq(musics.id, id)).returning();
        if (!row) return fail(res, 404, "Not found");

        return ok(res, {music: row});
    },
});
