// pages/api/webhooks/stripe.ts
import type {NextApiRequest, NextApiResponse} from "next";
import Stripe from "stripe";
import {stripe} from "@/lib/stripe";
import {db} from "@/lib/db";
import {creditLedger, creditPurchases, stripeEvents} from "@/lib/db/schema.billing";
import {appUsers} from "@/lib/db/schema.auth";
import {eq, sql} from "drizzle-orm";

export const config = {api: {bodyParser: false}};

async function readRawBody(req: NextApiRequest) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const sig = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !sig) return res.status(400).send("Missing webhook secret/signature");

    const raw = await readRawBody(req);

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(raw, String(sig), secret);
    } catch (e: any) {
        return res.status(400).send(`Invalid signature: ${e?.message || "?"}`);
    }

    // Idempotence event-level
    const alreadyProcessed = await db.transaction(async (tx) => {
        const inserted = await tx
            .insert(stripeEvents)
            .values({id: event.id})
            .onConflictDoNothing()
            .returning({id: stripeEvents.id});

        return inserted.length === 0;
    });

    if (alreadyProcessed) return res.status(200).json({ok: true, duplicate: true});

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.id;

        const [purchase] = await db
            .select()
            .from(creditPurchases)
            .where(eq(creditPurchases.stripeCheckoutSessionId, sessionId));

        if (!purchase) return res.status(200).json({ok: true, ignored: "purchase_not_found"});
        if (purchase.status === "paid") return res.status(200).json({ok: true, ignored: "already_paid"});

        const userId = purchase.userId;
        const delta = (purchase.creditsBought ?? 0) + (purchase.bonusCredits ?? 0);

        await db.transaction(async (tx) => {
            // Mark purchase paid
            await tx
                .update(creditPurchases)
                .set({
                    status: "paid",
                    stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
                    stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
                    paidAt: new Date(),
                })
                .where(eq(creditPurchases.id, purchase.id));

            // Ledger (idempotent by unique constraint userId+reason+refId)
            await tx
                .insert(creditLedger)
                .values({
                    userId,
                    delta,
                    reason: "purchase",
                    refId: purchase.id, // stable idempotence
                })
                .onConflictDoNothing();

            // Atomic user credits update
            if (session.customer_details?.email) {
                await tx
                    .update(appUsers)
                    .set({
                        email: session.customer_details.email
                    })
                    .where(eq(appUsers.id, userId));
            }
            await tx
                .update(appUsers)
                .set({
                    credits: sql`${appUsers.credits}
                    +
                    ${delta}`,
                })
                .where(eq(appUsers.id, userId));
        });

        if (session.metadata?.draftId) {
            // TODO FOR EACH ELEMENTS OF THE DRAFT ELEMENTS
            // DO THE GENERATION => MUST PASS draftItemId on replicate call back
            // So it will be able to add it to timeline_clips
            // WHEN all are done => PRODUCES CLIP
        }
    }

    return res.status(200).json({ok: true});
}
