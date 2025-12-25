// lib/album/billingTypes.ts
import {z} from "zod";

export const TierSchema = z.enum(["standard", "creator"]);
export type Tier = z.infer<typeof TierSchema>;

export const PackSchema = z.object({
    id: z.string(),
    tier: TierSchema,
    name: z.string(),
    subtitle: z.string(),
    credits: z.number().int().positive(),
    priceEur: z.number().positive(),
    includedExtraCredits: z.number().int().min(0).optional(),
    badge: z.string().optional(),
    highlight: z.boolean().optional(),
    benefits: z.array(z.string()),
});
export type PackDTO = z.infer<typeof PackSchema>;

export const PromoEffectSchema = z.discriminatedUnion("kind", [
    z.object({kind: z.literal("percent"), percent: z.number().int().min(1).max(90)}),
    z.object({kind: z.literal("credits"), extraCredits: z.number().int().min(1).max(500)}),
]);
export type PromoEffect = z.infer<typeof PromoEffectSchema>;

export const PromoSchema = z.object({
    code: z.string(),
    label: z.string(),
    rarity: z.enum(["common", "uncommon", "rare", "jackpot"]),
    effect: PromoEffectSchema,
});
export type Promo = z.infer<typeof PromoSchema>;

export const AppliedPromoQuoteSchema = z.object({
    packId: z.string(),
    tier: TierSchema,

    // promo (nullable)
    promo: PromoSchema.nullable(),
    promoSource: z.enum(["manual", "roulette"]).nullable(),

    // pricing (server truth)
    basePriceEur: z.number(),
    finalPriceEur: z.number(),
    discountPercent: z.number().int().min(0).max(90),

    // credits (server truth)
    baseCredits: z.number().int(),
    finalCredits: z.number().int(),
    bonusCredits: z.number().int().min(0),
});
export type AppliedPromoQuote = z.infer<typeof AppliedPromoQuoteSchema>;

// ---------- API Schemas ----------

export const PacksResponseSchema = z.object({
    packs: z.array(PackSchema),
    recommendedPackId: z.string().nullable(),
});
export type PacksResponse = z.infer<typeof PacksResponseSchema>;

export const ValidatePromoBodySchema = z.object({
    packId: z.string(),
    tier: TierSchema,
    code: z.string().min(2).max(32),
    promoSource: z.enum(["manual"]).optional(), // validate endpoint = manual
});
export type ValidatePromoBody = z.infer<typeof ValidatePromoBodySchema>;

export const ValidatePromoResponseSchema = z.discriminatedUnion("ok", [
    z.object({ok: z.literal(true), quote: AppliedPromoQuoteSchema}),
    z.object({ok: z.literal(false), error: z.string()}),
]);
export type ValidatePromoResponse = z.infer<typeof ValidatePromoResponseSchema>;

export const SpinPromoBodySchema = z.object({
    packId: z.string(),
    tier: TierSchema,
});
export type SpinPromoBody = z.infer<typeof SpinPromoBodySchema>;

export const SpinPromoResponseSchema = z.discriminatedUnion("ok", [
    z.object({ok: z.literal(true), quote: AppliedPromoQuoteSchema}),
    z.object({ok: z.literal(false), error: z.string()}),
]);
export type SpinPromoResponse = z.infer<typeof SpinPromoResponseSchema>;

export const CheckoutBodySchema = z.object({
    draftId: z.string().uuid(),
    packId: z.string(),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
    promoCode: z.string().nullable().optional(),
    promoSource: z.enum(["manual", "roulette"]).nullable().optional(),
});
export type CheckoutBody = z.infer<typeof CheckoutBodySchema>;

export const CheckoutResponseSchema = z.discriminatedUnion("ok", [
    z.object({ok: z.literal(true), url: z.string().min(1)}),
    z.object({ok: z.literal(false), error: z.string()}),
]);
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;
