// pages/api/albums/index.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albums} from "@/lib/db/schema";
import {eq} from "drizzle-orm";

const zCreate = z.object({
    title: z.string().min(1).max(80).optional(),
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const parsed = zCreate.safeParse(req.body ?? {});
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const [row] = await db
            .insert(albums)
            .values({
                userId: viewer.user.id,
                title: parsed.data.title ?? "Mon premier album",
            })
            .returning();

        return ok(res, {album: row}, 201);
    },

    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const rows = await db
            .select()
            .from(albums)
            .where(eq(albums.userId, viewer.user.id));

        return ok(res, {albums: rows});
    },
});
