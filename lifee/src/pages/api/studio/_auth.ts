import type { NextApiRequest, NextApiResponse } from "next";
import { getUserIdFromReq} from "@/pages/api/auth/session";

export async function requireUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
    const userId = await getUserIdFromReq(req);
    if (!userId) {
        res.status(401).send("Unauthorized");
        return null;
    }
    return userId;
}
