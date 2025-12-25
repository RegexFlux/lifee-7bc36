// pages/api/auth/me.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {apiHandler} from "@/lib/api/handler";
import {ok} from "@/lib/api/response";
import {requireViewer} from "@/lib/auth/require";

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const viewer = await requireViewer(req, res);
        return ok(res, {user: viewer.user, session: {id: viewer.sessionId, isNew: viewer.isNewSession}});
    },
});
