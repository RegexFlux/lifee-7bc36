import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {and, desc, eq} from "drizzle-orm";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {db} from "@/lib/db";
import {albums} from "@/lib/db/schema";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const q = z
            .object({limit: z.coerce.number().int().min(1).max(50).default(25)})
            .safeParse(req.query);
        if (!q.success) return fail(res, 400, "Invalid query", q.error.flatten());

        const rows = await db
            .select({
                id: albums.id,
                title: albums.title,
                mode: albums.mode,
                createdAt: albums.createdAt,
                updatedAt: albums.updatedAt,
            })
            .from(albums)
            .where(and(eq(albums.userId, viewer.user.id)))
            .orderBy(desc(albums.updatedAt), desc(albums.createdAt))
            .limit(q.data.limit);

        return ok(res, {albums: rows});
    },

    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const body = z
            .object({
                title: z.string().max(120).optional(),
            })
            .safeParse(req.body ?? {});
        if (!body.success) return fail(res, 400, "Invalid body", body.error.flatten());

        const [row] = await db
            .insert(albums)
            .values({
                userId: viewer.user.id,
                title: body.data.title ?? "Untitled",
                mode: "studio_help",
            })
            .returning();

        return ok(res, {album: row}, 201);
    },
});
