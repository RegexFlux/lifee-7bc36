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
import {appUsers} from "@/lib/db/schema.auth";

export const studioAssets = pgTable(
    "studio_assets",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),

        type: text("type").notNull(), // "image" | "video"
        title: text("title").notNull(),

        month: integer("month").notNull(), // 1..12
        year: integer("year").notNull(),

        durationSec: integer("duration_sec"),
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
        userId: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),

        assetId: uuid("asset_id").notNull().references(() => studioAssets.id, { onDelete: "cascade" }),
        position: integer("position").notNull(), // order

        source: text("source").notNull().default("library"), // "library"|"generated"
        context: text("context"),

        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => ({
        userIdx: index("timeline_clips_user_idx").on(t.userId),
        posIdx: index("timeline_clips_user_pos_idx").on(t.userId, t.position),
    })
);

export const musicTracks = pgTable("music_tracks", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    duration: text("duration").notNull(),
    genre: text("genre").notNull(),
    previewUrl: text("preview_url"),
    isActive: boolean("is_active").notNull().default(true),
});

export const exportJobs = pgTable(
    "export_jobs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),

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