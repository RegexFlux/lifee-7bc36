// pages/api/album/promo/spin.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {requireUserId} from "@/pages/api/studio/_auth";
import {SpinPromoBodySchema, SpinPromoResponseSchema, type SpinPromoResponse} from "@/types/billing";
import {getPackForUser} from "@/lib/album/packs.server";
import {pickWeightedPromo, computeQuote} from "@/lib/album/promos.server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<SpinPromoResponse>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).json({ok: false, error: "Method not allowed"});

    try {
        const body = SpinPromoBodySchema.parse(req.body);

        const pack = getPackForUser(userId, body.packId);
        if (!pack) return res.status(400).json({ok: false, error: "Invalid pack"});

        const promo = pickWeightedPromo(body.tier);
        const quote = computeQuote(pack, body.tier, promo, "roulette");

        const payload = {ok: true as const, quote};
        SpinPromoResponseSchema.parse(payload);

        return res.status(200).json(payload);
    } catch (e: any) {
        return res.status(400).json({ok: false, error: e?.message || "Invalid body"});
    }
}
