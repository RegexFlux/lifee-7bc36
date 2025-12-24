import type {NextApiRequest, NextApiResponse} from "next";
import Stripe from "stripe";
import {requireUserId} from "@/pages/api/studio/_auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {apiVersion: "2024-06-20"});

const PACKS = {
    std_20: {name: "Starter", amountCents: 1500, currency: "eur"},
    std_50: {name: "Plus", amountCents: 3200, currency: "eur"},
    cr_40: {name: "Créateur", amountCents: 2900, currency: "eur"},
    cr_80: {name: "Studio Pro", amountCents: 4900, currency: "eur"},
} as const;

type PackId = keyof typeof PACKS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as { packId?: PackId };
    const packId = body?.packId;
    if (!packId || !(packId in PACKS)) return res.status(400).send("Invalid packId");

    const pack = PACKS[packId];

    const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    if (!baseUrl) return res.status(500).send("Missing APP_URL");

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${baseUrl}/studio?paid=1`,
        cancel_url: `${baseUrl}/studio?canceled=1`,
        payment_method_types: ["card"],
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: pack.currency,
                    unit_amount: pack.amountCents,
                    product_data: {name: pack.name},
                },
            },
        ],
        metadata: {
            userId,
            packId,
        },
    });

    return res.status(200).json({url: session.url});
}
