// pages/api/album/promo/validate.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {requireUserId} from "@/pages/api/studio/_auth";
import {ValidatePromoBodySchema, ValidatePromoResponseSchema, type ValidatePromoResponse} from "@/types/billing";
import {getPackForUser} from "@/lib/album/packs.server";
import {resolvePromo, computeQuote} from "@/lib/album/promos.server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ValidatePromoResponse>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).json({ok: false, error: "Method not allowed"});

    try {
        const body = ValidatePromoBodySchema.parse(req.body);

        const pack = getPackForUser(userId, body.packId);
        if (!pack) return res.status(400).json({ok: false, error: "Invalid pack"});

        const promo = resolvePromo(body.code);
        if (!promo) return res.status(404).json({ok: false, error: "Code promo inconnu"});

        const quote = computeQuote(pack, body.tier, promo, "manual");
        const payload = {ok: true as const, quote};
        ValidatePromoResponseSchema.parse(payload);

        return res.status(200).json(payload);
    } catch (e: any) {
        return res.status(400).json({ok: false, error: e?.message || "Invalid body"});
    }
}
