import type {NextApiRequest, NextApiResponse} from "next";
import Stripe from "stripe";
import {db} from "@/lib/db";
import {appUsers} from "@/lib/db/schema.auth";
import {creditPurchases, creditLedger, stripeEvents} from "@/lib/db/schema.billing";
import {eq, sql} from "drizzle-orm";

export const config = {api: {bodyParser: false}};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2024-06-20",
});

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
}

// pack snapshot côté serveur (ne jamais prendre credits depuis metadata client)
const PACKS = {
    std_20: {credits: 20, bonus: 0, amountCents: 1500, currency: "eur"},
    std_50: {credits: 50, bonus: 0, amountCents: 3200, currency: "eur"},
    cr_40: {credits: 40, bonus: 5, amountCents: 2900, currency: "eur"},
    cr_80: {credits: 80, bonus: 10, amountCents: 4900, currency: "eur"},
} as const;

type PackId = keyof typeof PACKS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") return res.status(400).send("Missing Stripe signature");

    const raw = await readRawBody(req);

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
    } catch (e: any) {
        return res.status(400).send(`Webhook signature verification failed: ${e?.message || "invalid"}`);
    }

    // ✅ idempotence au niveau event
    const [already] = await db.select().from(stripeEvents).where(eq(stripeEvents.id, event.id));
    if (already) return res.status(200).json({ok: true, dedup: true});

    // on enregistre l’event tôt (anti double si crash ensuite)
    await db.insert(stripeEvents).values({id: event.id}).onConflictDoNothing();

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;

            // on crédite uniquement si payé
            if (session.payment_status !== "paid") return res.status(200).json({ok: true});

            const userId = session.metadata?.userId;
            const packId = session.metadata?.packId as PackId | undefined;

            if (!userId || !packId || !(packId in PACKS)) {
                return res.status(200).json({ok: true, ignored: "missing metadata"});
            }

            const pack = PACKS[packId];
            const creditsGranted = pack.credits + pack.bonus;

            // Upsert purchase
            await db
                .insert(creditPurchases)
                .values({
                    userId,
                    packId,
                    creditsBought: pack.credits,
                    bonusCredits: pack.bonus,
                    amountCents: pack.amountCents,
                    currency: pack.currency,
                    status: "paid",
                    stripeCheckoutSessionId: session.id,
                    stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
                    stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
                    paidAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: creditPurchases.stripeCheckoutSessionId,
                    set: {
                        status: "paid",
                        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
                        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
                        paidAt: new Date(),
                    },
                });

            // Ledger idempotent : reason+refId
            const refId = `checkout:${session.id}`;
            const inserted = await db
                .insert(creditLedger)
                .values({userId, delta: creditsGranted, reason: "purchase", refId})
                .onConflictDoNothing()
                .returning({id: creditLedger.id});

            // si ledger a été inséré => on incrémente le solde
            if (inserted.length > 0) {
                await db
                    .update(appUsers)
                    .set({
                        credits: sql`${appUsers.credits}
                        +
                        ${creditsGranted}`
                    })
                    .where(eq(appUsers.id, userId));
            }

            return res.status(200).json({ok: true});
        }

        // (Optionnel) refunds → ledger négatif + status refunded

        return res.status(200).json({ok: true, ignored: true});
    } catch (e: any) {
        // Si tu veux : log quelque part
        return res.status(500).send(e?.message || "Webhook processing failed");
    }
}
