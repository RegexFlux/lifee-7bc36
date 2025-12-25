// pages/api/admin/musics/index.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireAdmin} from "@/lib/admin/requireAdmin";
import {db} from "@/lib/db";
import {musics} from "@/lib/db/schema";

const zBody = z.object({
    provider: z.string().default("internal"),
    title: z.string().min(1),
    artist: z.string().optional(),
    durationSec: z.number().int().positive().optional(),
    fileKey: z.string().min(1),
    waveformKey: z.string().optional(),
    isActive: z.boolean().optional(),
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        requireAdmin(req);

        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const [row] = await db
            .insert(musics)
            .values({
                provider: parsed.data.provider,
                title: parsed.data.title,
                artist: parsed.data.artist,
                durationSec: parsed.data.durationSec,
                fileKey: parsed.data.fileKey,
                waveformKey: parsed.data.waveformKey,
                isActive: parsed.data.isActive ?? true,
            })
            .returning();

        return ok(res, {music: row}, 201);
    },
});
