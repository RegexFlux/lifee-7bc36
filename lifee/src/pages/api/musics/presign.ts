// pages/api/admin/musics/presign.ts
import crypto from "crypto";
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireAdmin} from "@/lib/admin/requireAdmin";
import {presignPutObject} from "@/lib/aws/s3/presignPut";

const zBody = z.object({
    contentType: z.string().min(3),
    ext: z.string().min(1).max(10),
    folder: z.enum(["musics", "waveforms"]).default("musics"),
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        requireAdmin(req);

        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const {contentType, ext, folder} = parsed.data;

        const id = crypto.randomUUID();
        const cleanExt = ext.replace(".", "");
        const key = `lifee/${folder}/${id}.${cleanExt}`;

        const uploadUrl = await presignPutObject({key, contentType, expiresIn: 60 * 10});
        return ok(res, {uploadUrl, key, expiresInSec: 60 * 10});
    },
});
