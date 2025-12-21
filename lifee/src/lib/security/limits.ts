import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeeDailyRuns, lifeeIpAttempts, lifeeJobs } from "@/lib/db/schema";
import { dayKeyUTC } from "./ip";

export function oneTryScopeKey() {
    const mode = (process.env.LIFEE_ONE_TRY_MODE || "day").toLowerCase();
    if (mode === "forever") return "forever";
    return dayKeyUTC();
}

export async function enforceOneTryPerIpOrThrow(params: { ipHash: string; jobId: string }) {
    const scopeKey = oneTryScopeKey();

    // insert PK(ipHash,scopeKey) => si conflict => déjà tenté
    const inserted = await db
        .insert(lifeeIpAttempts)
        .values({ ipHash: params.ipHash, scopeKey, jobId: params.jobId })
        .onConflictDoNothing()
        .returning({ ipHash: lifeeIpAttempts.ipHash });

    if (inserted.length === 0) {
        const msg = scopeKey === "forever"
            ? "Essai déjà utilisé pour cette IP."
            : "Essai déjà utilisé aujourd’hui pour cette IP.";
        const err = new Error(msg);
        // @ts-ignore
        err.statusCode = 429;
        throw err;
    }
}

export async function releaseIpAttempt(params: { ipHash: string; jobId: string }) {
    // si on veut autoriser un retry quand la création échoue avant coût
    const scopeKey = oneTryScopeKey();
    await db.delete(lifeeIpAttempts).where(and(eq(lifeeIpAttempts.ipHash, params.ipHash), eq(lifeeIpAttempts.scopeKey, scopeKey)));
}

export async function reserveDailyRunOrThrow() {
    const cap = Number(process.env.LIFEE_DAILY_RUN_CAP || "200");
    const day = dayKeyUTC();

    // upsert: count = count + 1
    const rows = await db
        .insert(lifeeDailyRuns)
        .values({ day, count: 1 })
        .onConflictDoUpdate({
            target: lifeeDailyRuns.day,
            set: { count: sql`${lifeeDailyRuns.count} + 1` },
        })
        .returning({ count: lifeeDailyRuns.count });

    const count = rows[0]?.count ?? 0;

    if (count > cap) {
        // rollback local du compteur (best effort)
        await db
            .update(lifeeDailyRuns)
            .set({ count: sql`${lifeeDailyRuns.count} - 1` })
            .where(eq(lifeeDailyRuns.day, day));

        throw new Error("Cap journalier atteint (anti-frais).");
    }
}

export async function enforceMaxActiveJobsOrThrow() {
    const maxActive = Number(process.env.LIFEE_MAX_ACTIVE_JOBS || "25");

    // count jobs in starting/processing
    const rows = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int as count
    FROM ${lifeeJobs}
    WHERE status IN ('starting','processing','queued')
  `);

    const count = rows[0]?.count ?? 0;
    if (count >= maxActive) {
        throw new Error("Trop de générations en cours. Réessaie dans un instant.");
    }
}
