// pages/api/admin/musics/presign.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireAdmin} from "@/lib/admin/requireAdmin";

// TODO: remplace par ton helper existant
async function presignPut(_key: string, _contentType: string) {
    throw new Error("presignPut not implemented (plug your S3 helper)");
}

const zBody = z.object({
    contentType: z.string().min(3),
    ext: z.string().min(1).max(10),
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        requireAdmin(req);

        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const {contentType, ext} = parsed.data;

        const id = crypto.randomUUID();
        const fileKey = `lifee/musics/${id}.${ext.replace(".", "")}`;

        const uploadUrl = await presignPut(fileKey, contentType);
        return ok(res, {uploadUrl, fileKey});
    },
});
