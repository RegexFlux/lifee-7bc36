import type {NextApiRequest, NextApiResponse} from "next";
import {getUserFromReq} from "@/pages/api/auth/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await getUserFromReq(req);
    if (!user) {
        return res.status(401).send("Unauthorized");
    }
    return res.status(200).json({user});
}
