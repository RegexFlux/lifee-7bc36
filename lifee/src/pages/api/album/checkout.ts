// pages/api/album/checkout.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";
import {db} from "@/lib/db";
import {requireUserId} from "@/pages/api/studio/_auth";
import {albumDraftItems, albumDrafts} from "@/lib/db/schema.album";
import {stripe} from "@/lib/stripe";
import {creditPurchases} from "@/lib/db/schema.billing";
import {CheckoutBodySchema, type CheckoutResponse} from "@/types/billing";
import {getPackForUser} from "@/lib/album/packs.server";
import {resolvePromo, computeQuote} from "@/lib/album/promos.server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<CheckoutResponse>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).json({ok: false, error: "Method not allowed"});

    let body: any;
    try {
        body = CheckoutBodySchema.parse(req.body);
    } catch (e: any) {
        return res.status(400).json({ok: false, error: e?.message || "Invalid body"});
    }

    const [draft] = await db
        .select({id: albumDrafts.id, userId: albumDrafts.userId, requiredCredits: albumDrafts.requiredCredits})
        .from(albumDrafts)
        .where(and(eq(albumDrafts.id, body.draftId), eq(albumDrafts.userId, userId)));

    if (!draft) return res.status(404).json({ok: false, error: "Draft not found"});

    const items = await db
        .select({assetId: albumDraftItems.assetId})
        .from(albumDraftItems)
        .where(eq(albumDraftItems.draftId, body.draftId));

    if (items.length === 0) return res.status(400).json({ok: false, error: "Draft empty"});

    const pack = getPackForUser(userId, body.packId);
    if (!pack) return res.status(400).json({ok: false, error: "Invalid pack"});

    // Option sécurité: empêcher achat pack insuffisant pour ce draft
    if (pack.credits < draft.requiredCredits) {
        return res.status(400).json({ok: false, error: `Pack insuffisant (>= ${draft.requiredCredits} requis)`});
    }

    // Validate promo (server side)
    const promoCode = (body.promoCode ?? null)?.trim() || null;
    const promo = promoCode ? resolvePromo(promoCode) : null;
    if (promoCode && !promo) {
        return res.status(400).json({ok: false, error: "Code promo invalide"});
    }

    const tier = pack.tier;
    const quote = computeQuote(pack, tier, promo, body.promoSource ?? null);

    const unitAmountCents = Math.round(quote.finalPriceEur * 100);
    const bonusCredits = quote.bonusCredits; // inclut pack extra + promo credits si applicable

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${body.successUrl}?paid=1&draftId=${encodeURIComponent(body.draftId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${body.cancelUrl}?canceled=1&draftId=${encodeURIComponent(body.draftId)}`,
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: "eur",
                    unit_amount: unitAmountCents,
                    product_data: {
                        name: `Lifee — Pack ${pack.name}`,
                        description: `${pack.credits + (pack.includedExtraCredits ?? 0)} crédits de base • ${pack.tier === "creator" ? "1080p + rendu amélioré" : "720p"}${promo ? ` • Promo ${promo.code}` : ""}`,
                    },
                },
            },
        ],
        metadata: {
            userId,
            draftId: body.draftId,
            packId: pack.id,
            creditsBought: String(pack.credits),
            bonusCredits: String(bonusCredits),
            promoCode: promo?.code ?? "",
            promoSource: body.promoSource ?? "",
            discountPercent: String(quote.discountPercent),
        },
    });

    await db.insert(creditPurchases).values({
        userId,
        packId: pack.id,
        creditsBought: pack.credits,
        bonusCredits: bonusCredits,
        amountCents: unitAmountCents,
        currency: "eur",
        draftId: body.draftId,
        stripeCheckoutSessionId: session.id,
        status: "created",
        promoCode: promo?.code ?? null,
        promoSource: body.promoSource ?? null,
        discountPercent: quote.discountPercent,
    });

    return res.status(200).json({ok: true, url: session.url || ""});
}
