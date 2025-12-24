// lib/security/rateLimit.ts
import {and, eq, sql} from "drizzle-orm";
import {db} from "@/lib/db";
import {rateLimits} from "@/lib/db/schema"; // <- ton schema.rateLimits

export class HttpError extends Error {
    statusCode: number;
    retryAfterSec?: number;

    constructor(statusCode: number, message: string, retryAfterSec?: number) {
        super(message);
        this.statusCode = statusCode;
        this.retryAfterSec = retryAfterSec;
    }
}

export async function consumeRateLimit(params: {
    key: string;
    max: number;
    windowSec: number;
}): Promise<void> {
    const {key, max, windowSec} = params;
    const now = new Date();
    const nextReset = new Date(now.getTime() + windowSec * 1000);

    await db.transaction(async (tx) => {
        const [row] = await tx.select().from(rateLimits).where(eq(rateLimits.key, key));

        // 1) première fois
        if (!row) {
            await tx.insert(rateLimits).values({key, count: 1, resetAt: nextReset});
            return;
        }

        // 2) fenêtre expirée -> reset
        if (row.resetAt <= now) {
            await tx
                .update(rateLimits)
                .set({count: 1, resetAt: nextReset})
                .where(eq(rateLimits.key, key));
            return;
        }

        // 3) fenêtre active -> incrément atomique si < max
        const updated = await tx
            .update(rateLimits)
            .set({
                count: sql`${rateLimits.count}
                + 1`
            })
            .where(and(eq(rateLimits.key, key), sql`${rateLimits.count}
            <
            ${max}`))
            .returning({count: rateLimits.count, resetAt: rateLimits.resetAt});

        if (updated.length === 0) {
            const retryAfterSec = Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000));
            throw new HttpError(429, "Trop de exports. Réessayez plus tard.", retryAfterSec);
        }
    });
}
