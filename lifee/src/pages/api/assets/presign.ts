// pages/api/assets/presign.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {presignPutObject} from "@/lib/aws/s3/presignPut";
import {makeAssetObjectKey} from "@/lib/assets/keys";
import {zAssetType} from "@/lib/validation/enums";

const zBody = z.object({
    contentType: z.string().min(3),
    ext: z.string().min(1).max(10),
    type: zAssetType, // "image" | "video"
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const {contentType, ext, type} = parsed.data;

        const key = makeAssetObjectKey({userId: viewer.user.id, ext, kind: type});
        const uploadUrl = await presignPutObject({key, contentType, expiresIn: 60 * 10});

        return ok(res, {uploadUrl, key, expiresInSec: 60 * 10});
    },
});
