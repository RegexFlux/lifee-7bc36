// pages/api/musics/index.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {asc, eq} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok} from "@/lib/api/response";
import {db} from "@/lib/db";
import {musics} from "@/lib/db/schema";
import {requireViewer} from "@/lib/auth/require";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        await requireViewer(req, res);

        const rows = await db
            .select()
            .from(musics)
            .where(eq(musics.isActive, true))
            .orderBy(asc(musics.title));

        return ok(res, {musics: rows});
    },
});
