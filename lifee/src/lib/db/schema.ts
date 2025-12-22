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
    uuid,
    boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Users ---
export const users = pgTable(
    "users",
    {
        id: text("id").primaryKey(), // uuid
        email: text("email").notNull(),
        credits: number("credits").default(0),
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


export const studioAssets = pgTable(
    "studio_assets",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

        type: text("type").notNull(), // "image" | "video"
        title: text("title").notNull(),

        // stocke proprement : 1er jour du mois (ou month/year séparés)
        month: integer("month").notNull(), // 1..12
        year: integer("year").notNull(), // 2025

        durationSec: integer("duration_sec"), // video only
        fileUrl: text("file_url"),
        thumbnailUrl: text("thumbnail_url"),

        isGenerated: boolean("is_generated").notNull().default(false),
        context: text("context"),

        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => ({
        userIdx: index("studio_assets_user_idx").on(t.userId),
        createdIdx: index("studio_assets_user_created_idx").on(t.userId, t.createdAt),
    })
);

export const timelineClips = pgTable(
    "timeline_clips",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

        assetId: uuid("asset_id").notNull().references(() => studioAssets.id, { onDelete: "cascade" }),
        position: integer("position").notNull(), // order sur la timeline

        // optionnel, override par clip
        context: text("context"),
        source: text("source").notNull().default("library"), // "library" | "generated"

        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => ({
        userIdx: index("timeline_clips_user_idx").on(t.userId),
        orderIdx: index("timeline_clips_user_position_idx").on(t.userId, t.position),
    })
);

export const exportJobs = pgTable(
    "export_jobs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        status: text("status").notNull(), // queued|rendering|done|error
        progress: integer("progress").notNull().default(0),
        url: text("url"),
        musicTrackId: text("music_track_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => ({
        userIdx: index("export_jobs_user_idx").on(t.userId),
    })
);

export const musicTracks = pgTable("music_tracks", {
    id: text("id").primaryKey(), // "m1"
    title: text("title").notNull(),
    duration: text("duration").notNull(),
    genre: text("genre").notNull(),
    previewUrl: text("preview_url"),
    isActive: boolean("is_active").notNull().default(true),
});

// (optionnel) relations pour join Drizzle
export const studioAssetsRelations = relations(studioAssets, ({ many }) => ({
    clips: many(timelineClips),
}));

export const timelineClipsRelations = relations(timelineClips, ({ one }) => ({
    asset: one(studioAssets, { fields: [timelineClips.assetId], references: [studioAssets.id] }),
}));