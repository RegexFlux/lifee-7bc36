import type { NextApiRequest, NextApiResponse } from "next";


export async function requireUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
    const session = await getServerSession(req, res, authOptions);
    const userId = session?.user?.id;
    if (!userId) {
        res.status(401).send("Unauthorized");
        return null;
    }
    return userId;
}
