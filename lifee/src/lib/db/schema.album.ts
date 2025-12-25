import {pgTable, uuid, text, integer, timestamp, index, uniqueIndex} from "drizzle-orm/pg-core";
import {appUsers} from "@/lib/db/schema.auth";
import {studioAssets, exportJobs} from "@/lib/db/schema.studio";

export const albumDrafts = pgTable(
    "album_drafts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id").notNull().references(() => appUsers.id, {onDelete: "cascade"}),
        status: text("status").notNull().default("draft"), // draft|paid|archived
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [index("album_drafts_user_idx").on(t.userId), index("album_drafts_user_updated_idx").on(t.userId, t.updatedAt)]
);

export const albumDraftItems = pgTable(
    "album_draft_items",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        draftId: uuid("draft_id").notNull().references(() => albumDrafts.id, {onDelete: "cascade"}),
        assetId: uuid("asset_id").notNull().references(() => studioAssets.id, {onDelete: "cascade"}),
        position: integer("position").notNull(),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [
        index("album_draft_items_draft_pos_idx").on(t.draftId, t.position),
        uniqueIndex("album_draft_items_unique").on(t.draftId, t.assetId),
    ]
);

export const albumOrders = pgTable(
    "album_orders",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id").notNull().references(() => appUsers.id, {onDelete: "cascade"}),

        draftId: uuid("draft_id").references(() => albumDrafts.id, {onDelete: "set null"}),

        status: text("status").notNull().default("generating"), // generating|assembling|done|error
        packId: text("pack_id"), // ex: "cr_40"
        requiredCredits: integer("required_credits").notNull().default(0),

        exportJobId: uuid("export_job_id").references(() => exportJobs.id, {onDelete: "set null"}),
        finalUrl: text("final_url"),

        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
        error: text("error"),
    },
    (t) => [index("album_orders_user_idx").on(t.userId, t.createdAt)]
);

export const albumOrderItems = pgTable(
    "album_order_items",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        orderId: uuid("order_id").notNull().references(() => albumOrders.id, {onDelete: "cascade"}),

        sourceAssetId: uuid("source_asset_id").notNull().references(() => studioAssets.id, {onDelete: "cascade"}),
        videoAssetId: uuid("video_asset_id").references(() => studioAssets.id, {onDelete: "set null"}),

        jobId: text("job_id"), // lifeeJobs.id (uuid string)
        position: integer("position").notNull(),

        status: text("status").notNull().default("queued"), // queued|starting|processing|succeeded|failed
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
        error: text("error"),
    },
    (t) => [
        index("album_order_items_order_idx").on(t.orderId, t.position),
        index("album_order_items_job_idx").on(t.jobId),
    ]
);