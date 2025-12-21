import {
    pgTable,
    text,
    timestamp,
    real,
    integer,
    varchar,
    primaryKey,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

// --- Users ---
export const users = pgTable(
    "users",
    {
        id: text("id").primaryKey(), // uuid
        email: text("email").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("users_email_uq").on(t.email),
    ]
);

// --- Sessions (cookie-based) ---
export const sessions = pgTable(
    "sessions",
    {
        id: text("id").primaryKey(), // uuid
        userId: text("user_id").notNull(),
        tokenHash: text("token_hash").notNull(), // sha256(token)
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    },
    (t) => [
        index("sessions_user_idx").on(t.userId),
        uniqueIndex("sessions_token_uq").on(t.tokenHash),
    ]
);

// --- Email login codes (for existing users) ---
export const emailLoginCodes = pgTable(
    "email_login_codes",
    {
        id: text("id").primaryKey(), // uuid
        email: text("email").notNull(),
        codeHash: text("code_hash").notNull(), // sha256(email + code + secret)
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        usedAt: timestamp("used_at", { withTimezone: true }),
        attempts: integer("attempts").notNull().default(0),
    },
    (t) => [
        index("email_login_codes_email_idx").on(t.email, t.createdAt),
    ]
);

// --- Generic rate limits (DB-based, no Redis needed) ---
export const rateLimits = pgTable("rate_limits", {
    key: text("key").primaryKey(), // ex: "auth:start:ip:<hash>"
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export const lifeeJobs = pgTable(
    "lifee_jobs",
    {
        id: text("id").primaryKey(), // uuid string (crypto.randomUUID())
        shareSlug: varchar("share_slug", { length: 32 }).notNull(),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

        status: text("status").notNull(), // uploading|queued|starting|processing|succeeded|failed
        progress: real("progress"), // 0..1
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
    (t) => [
        uniqueIndex("lifee_jobs_share_slug_uq").on(t.shareSlug),
        index("lifee_jobs_status_idx").on(t.status),
        index("lifee_jobs_created_idx").on(t.createdAt),
    ]
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
    (t) => [
        index("lifee_job_events_job_idx").on(t.jobId, t.createdAt),
    ]
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
    (t) => [
        primaryKey({ columns: [t.ipHash, t.scopeKey] }),
        // or give it a custom name:
        // primaryKey({ name: "lifee_ip_attempts_pk", columns: [t.ipHash, t.scopeKey] }),
    ]
);

// Hard cap global/jour pour éviter explosion des coûts
export const lifeeDailyRuns = pgTable("lifee_daily_runs", {
    day: text("day").primaryKey(), // "YYYY-MM-DD"
    count: integer("count").notNull().default(0),
});
