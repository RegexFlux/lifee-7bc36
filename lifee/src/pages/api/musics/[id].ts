// pages/api/musics/[id].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {eq} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db";
import {musics} from "@/lib/db/schema";
import {requireViewer} from "@/lib/auth/require";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        await requireViewer(req, res);

        const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!id) return fail(res, 400, "Missing id");

        const row = (await db.select().from(musics).where(eq(musics.id, id)).limit(1))[0];
        if (!row) return fail(res, 404, "Not found");

        return ok(res, {music: row});
    },
});
