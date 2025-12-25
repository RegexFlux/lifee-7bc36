// pages/api/credits/packs.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {asc, eq} from "drizzle-orm";
import {apiHandler} from "@/lib/api/handler";
import {ok} from "@/lib/api/response";
import {db} from "@/lib/db";
import {creditPacks} from "@/lib/db/schema";

export default apiHandler({
    GET: async (_req: NextApiRequest, res: NextApiResponse) => {
        const packs = await db
            .select()
            .from(creditPacks)
            .where(eq(creditPacks.isActive, true))
            .orderBy(asc(creditPacks.priceEur));

        return ok(res, {packs});
    },
});
