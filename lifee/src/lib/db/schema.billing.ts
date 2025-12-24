import {
    pgTable,
    uuid,
    text,
    integer,
    timestamp,
    uniqueIndex,
    index,
    boolean,
} from "drizzle-orm/pg-core";
import {appUsers} from "@/lib/db/schema.auth";

export type PurchaseStatus = "created" | "paid" | "failed" | "refunded";

export const creditPurchases = pgTable(
    "credit_purchases",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id").notNull().references(() => appUsers.id, {onDelete: "cascade"}),

        // pack snapshot (ne jamais faire confiance au client)
        packId: text("pack_id").notNull(),                // ex: "cr_80"
        creditsBought: integer("credits_bought").notNull(), // ex: 80
        bonusCredits: integer("bonus_credits").notNull().default(0), // ex: 10
        amountCents: integer("amount_cents").notNull(),   // ex: 4900
        currency: text("currency").notNull().default("eur"),

        status: text("status").notNull().default("created"), // PurchaseStatus

        // Stripe refs
        stripeCheckoutSessionId: text("stripe_checkout_session_id"),
        stripePaymentIntentId: text("stripe_payment_intent_id"),
        stripeCustomerId: text("stripe_customer_id"),

        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
        paidAt: timestamp("paid_at", {withTimezone: true}),
    },
    (t) => [
        index("credit_purchases_user_idx").on(t.userId, t.createdAt),
        uniqueIndex("credit_purchases_checkout_uq").on(t.stripeCheckoutSessionId),
        uniqueIndex("credit_purchases_pi_uq").on(t.stripePaymentIntentId),
    ]
);

export type CreditReason = "purchase" | "ai_generate" | "refund" | "admin_adjust";

export const creditLedger = pgTable(
    "credit_ledger",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id").notNull().references(() => appUsers.id, {onDelete: "cascade"}),

        delta: integer("delta").notNull(), // +credits / -credits
        reason: text("reason").notNull(),  // CreditReason

        // lien idempotent (ex: purchaseId, jobId)
        refId: text("ref_id").notNull(),

        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [
        index("credit_ledger_user_idx").on(t.userId, t.createdAt),
        uniqueIndex("credit_ledger_unique_ref").on(t.userId, t.reason, t.refId), // 🔥 anti double
    ]
);

// Optionnel mais très utile : idempotence webhook au niveau event Stripe
export const stripeEvents = pgTable(
    "stripe_events",
    {
        id: text("id").primaryKey(), // stripe event id: evt_...
        processedAt: timestamp("processed_at", {withTimezone: true}).notNull().defaultNow(),
    }
);
