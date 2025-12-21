import { pgTable, text, timestamp, real, integer, varchar, primaryKey, index, uniqueIndex } from "drizzle-orm/pg-core";

export const lifeeJobs = pgTable(
    "lifee_jobs",
    {
        id: text("id").primaryKey(), // uuid string (crypto.randomUUID())
        shareSlug: varchar("share_slug", { length: 32 }).notNull(),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

        status: text("status").notNull(), // uploading|queued|starting|processing|succeeded|failed
        progress: real("progress"),       // 0..1
        progressMessage: text("progress_message"),

        prompt: text("prompt"),
        email: text("email"),

        replicatePredictionId: text("replicate_prediction_id"),
        replicateStatus: text("replicate_status"),
        replicateLogs: text("replicate_logs"),
        replicateOutputUrl: text("replicate_output_url"),

        imageKey: text("image_key"),
        videoKey: text("video_key"),

        error: text("error"),
    },
    (t) => ({
        shareSlugUq: uniqueIndex("lifee_jobs_share_slug_uq").on(t.shareSlug),
        statusIdx: index("lifee_jobs_status_idx").on(t.status),
        createdIdx: index("lifee_jobs_created_idx").on(t.createdAt),
    })
);

export const lifeeJobEvents = pgTable(
    "lifee_job_events",
    {
        id: text("id").primaryKey(), // uuid
        jobId: text("job_id").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        type: text("type").notNull(), // info|warn|replicate
        message: text("message").notNull(),
    },
    (t) => ({
        jobIdx: index("lifee_job_events_job_idx").on(t.jobId, t.createdAt),
    })
);

// 1 essai / IP : par jour (ou "forever" si tu veux)
export const lifeeIpAttempts = pgTable(
    "lifee_ip_attempts",
    {
        ipHash: text("ip_hash").notNull(),
        scopeKey: text("scope_key").notNull(), // e.g. "2025-12-21" si mode=day, sinon "forever"
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        jobId: text("job_id").notNull(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.ipHash, t.scopeKey] }),
    })
);

// Hard cap global/jour pour éviter explosion des coûts
export const lifeeDailyRuns = pgTable(
    "lifee_daily_runs",
    {
        day: text("day").primaryKey(), // "YYYY-MM-DD"
        count: integer("count").notNull().default(0),
    }
);
