// lib/album/packs.server.ts
import type {PackDTO, Tier} from "@/types/billing";

export const MIN_CREDITS_PER_PURCHASE = 20;

const PACK_CATALOG: PackDTO[] = [
    {
        id: "std_20",
        tier: "standard",
        name: "Starter",
        subtitle: "Pour tester",
        credits: 20,
        priceEur: 15,
        badge: "Simple",
        benefits: ["720p", "Rendu stable", "Musique (sélection)"],
    },
    {
        id: "std_50",
        tier: "standard",
        name: "Plus",
        subtitle: "Meilleure valeur",
        credits: 50,
        priceEur: 32,
        badge: "⭐ Value",
        highlight: true,
        benefits: ["720p", "Support standard", "Musique (sélection)"],
    },
    {
        id: "cr_40",
        tier: "creator",
        name: "Créateur",
        subtitle: "1080p + plus rapide",
        credits: 40,
        priceEur: 29,
        includedExtraCredits: 5,
        badge: "Populaire",
        benefits: ["1080p", "Service plus rapide", "Support avancé", "Musique illimitée", "Rendu amélioré", "+5 crédits offerts"],
    },
    {
        id: "cr_80",
        tier: "creator",
        name: "Studio Pro",
        subtitle: "Priorité + gros bonus",
        credits: 80,
        priceEur: 49,
        includedExtraCredits: 10,
        badge: "🔥 Best",
        highlight: true,
        benefits: ["1080p", "Priorité rendu", "Support avancé", "Musique illimitée", "Rendu amélioré", "+10 crédits offerts"],
    },
];

// Ici tu peux filtrer selon user, pays, AB test, etc.
export function listPacksForUser(_userId: string): PackDTO[] {
    return PACK_CATALOG.filter((p) => p.credits >= MIN_CREDITS_PER_PURCHASE);
}

export function getPackForUser(userId: string, packId: string): PackDTO | null {
    return listPacksForUser(userId).find((p) => p.id === packId) ?? null;
}

export function recommendPacks(requiredCredits: number) {
    const sorted = [...PACK_CATALOG].sort((a, b) => a.credits - b.credits);
    const best = sorted.find((p) => p.credits >= requiredCredits) ?? sorted[sorted.length - 1];
    return {requiredCredits, recommendedPackId: best.id, packs: sorted};
}

export function recommendPackId(packs: PackDTO[], requiredCredits: number, tier?: Tier): string | null {
    const filtered = tier ? packs.filter((p) => p.tier === tier) : packs;
    const sorted = [...filtered].sort((a, b) => a.priceEur - b.priceEur);
    const adequate = sorted.filter((p) => p.credits >= requiredCredits);
    const pick = (adequate.find((p) => p.highlight) ?? adequate[0] ?? sorted[sorted.length - 1])?.id ?? null;
    return pick;
}
