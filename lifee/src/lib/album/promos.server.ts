// lib/album/promos.server.ts
import crypto from "node:crypto";
import type {PackDTO, PromoDTO, Tier, AppliedPromoQuote} from "@/types/billing";

const PROMOS: PromoDTO[] = [
    {code: "LUCKY5", label: "-5% immédiat", rarity: "common", effect: {kind: "percent", percent: 5}},
    {code: "LUCKY10", label: "-10% (nice)", rarity: "uncommon", effect: {kind: "percent", percent: 10}},
    {code: "LUCKY15", label: "-15% (gros win)", rarity: "rare", effect: {kind: "percent", percent: 15}},
    {code: "FLASH20", label: "-20% (flash)", rarity: "rare", effect: {kind: "percent", percent: 20}},
    {code: "JACKPOT25", label: "-25% (jackpot)", rarity: "jackpot", effect: {kind: "percent", percent: 25}},

    {code: "BONUS10", label: "+10 crédits offerts", rarity: "uncommon", effect: {kind: "credits", extraCredits: 10}},
    {code: "BONUS20", label: "+20 crédits offerts", rarity: "jackpot", effect: {kind: "credits", extraCredits: 20}},
];

function promoWeight(rarity: PromoDTO["rarity"]) {
    switch (rarity) {
        case "common":
            return 55;
        case "uncommon":
            return 26;
        case "rare":
            return 14;
        case "jackpot":
            return 5;
    }
    return 0;
}

export function resolvePromo(codeRaw: string): PromoDTO | null {
    const code = codeRaw.trim().toUpperCase();
    if (!code) return null;
    return PROMOS.find((p) => p.code === code) ?? null;
}

export function pickWeightedPromo(tier: Tier): PromoDTO {
    const weighted = PROMOS.map((p) => {
        const base = promoWeight(p.rarity);
        const boost = tier === "creator" ? (p.rarity === "rare" ? 4 : p.rarity === "jackpot" ? 2 : 0) : 0;
        return {promo: p, w: base + boost};
    });

    const total = weighted.reduce((a, b) => a + b.w, 0);
    const r = crypto.randomInt(0, total); // 0..total-1
    let acc = 0;
    for (const it of weighted) {
        acc += it.w;
        if (r < acc) return it.promo;
    }
    return weighted[weighted.length - 1]!.promo;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function computeQuote(pack: PackDTO, tier: Tier, promo: PromoDTO | null, promoSource: AppliedPromoQuote["promoSource"]): AppliedPromoQuote {
    const baseCredits = pack.credits + (pack.includedExtraCredits ?? 0);
    const basePriceEur = pack.priceEur;

    let finalPriceEur = basePriceEur;
    let bonusCredits = (pack.includedExtraCredits ?? 0);
    let discountPercent = 0;

    if (promo) {
        if (promo.effect.kind === "percent") {
            discountPercent = promo.effect.percent;
            finalPriceEur = clamp(basePriceEur * (1 - promo.effect.percent / 100), 0, basePriceEur);
        } else if (promo.effect.kind === "credits") {
            bonusCredits += promo.effect.extraCredits;
        }
    }

    const finalCredits = pack.credits + bonusCredits;

    return {
        packId: pack.id,
        tier,
        promo,
        promoSource: promo ? promoSource : null,
        basePriceEur,
        finalPriceEur,
        discountPercent,
        baseCredits,
        finalCredits,
        bonusCredits,
    };
}
