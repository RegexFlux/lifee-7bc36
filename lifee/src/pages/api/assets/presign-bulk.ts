// pages/api/assets/presign-bulk.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {z} from "zod";
import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";
import {presignPutObject} from "@/lib/aws/s3/presignPut";
import {makeAssetObjectKey} from "@/lib/assets/keys";
import {zAssetType} from "@/lib/validation/enums";

const zFile = z.object({
    contentType: z.string().min(3),
    ext: z.string().min(1).max(10),
    type: zAssetType,
});

const zBody = z.object({
    files: z.array(zFile).min(1).max(20), // anti-abus
});

export default apiHandler({
    POST: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);

        const parsed = zBody.safeParse(req.body);
        if (!parsed.success) return fail(res, 400, "Invalid body", parsed.error.flatten());

        const out = await Promise.all(
            parsed.data.files.map(async (f) => {
                const key = makeAssetObjectKey({userId: viewer.user.id, ext: f.ext, kind: f.type});
                const uploadUrl = await presignPutObject({key, contentType: f.contentType, expiresIn: 60 * 10});
                return {key, uploadUrl, type: f.type};
            })
        );

        return ok(res, {items: out, expiresInSec: 60 * 10});
    },
});
