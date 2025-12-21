import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function consumeRateLimitOrThrow(params: {
    key: string;
    limit: number;
    windowSec: number;
}) {
    const now = new Date();
    const resetAt = new Date(now.getTime() + params.windowSec * 1000);

    // Upsert: if expired, reset count to 1; else increment
    const existing = await db.select().from(rateLimits).where(eq(rateLimits.key, params.key)).limit(1);
    if (existing.length === 0) {
        await db.insert(rateLimits).values({ key: params.key, count: 1, resetAt });
        return;
    }

    const row = existing[0]!;
    const isExpired = new Date(row.resetAt as any).getTime() <= now.getTime();

    if (isExpired) {
        await db.update(rateLimits).set({ count: 1, resetAt }).where(eq(rateLimits.key, params.key));
        return;
    }

    // increment then check
    const updated = await db
        .update(rateLimits)
        .set({ count: sql`${rateLimits.count} + 1` })
        .where(eq(rateLimits.key, params.key))
        .returning({ count: rateLimits.count });

    const count = updated[0]?.count ?? (row.count as any);
    if (count > params.limit) {
        const err = new Error("Trop de tentatives. Réessaie plus tard.");
        // @ts-ignore
        err.statusCode = 429;
        throw err;
    }
}
