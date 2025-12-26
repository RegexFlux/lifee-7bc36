// src/lib/db/schema.ts
import {
    pgTable,
    pgEnum,
    uuid,
    text,
    integer,
    timestamp,
    boolean,
    real,
    jsonb,
    index,
    uniqueIndex, foreignKey,
} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";

import {
    USER_TYPES,
    AUTH_EMAIL_CODE_PURPOSES,
    ASSET_TYPES,
    REPLICATE_JOB_STATUSES,
    JOB_EVENT_LEVELS,
    JOB_EVENT_SOURCES,
    CREDIT_PACK_TIERS,
    CREDIT_PURCHASE_STATUSES,
    WEBHOOK_PROVIDERS,
    WEBHOOK_PROCESSING_STATUSES,
    ACCOUNT_LINK_STATUSES,
    CREDIT_EVENT_TYPES, ALBUM_MODES,
} from "@/lib/shared/enums";

/* ----------------------------- ENUMS (PG) ----------------------------- */

export const userTypeEnum = pgEnum("user_type", USER_TYPES);

export const authEmailCodePurposeEnum = pgEnum(
    "auth_email_code_purpose",
    AUTH_EMAIL_CODE_PURPOSES
);

export const assetTypeEnum = pgEnum("asset_type", ASSET_TYPES);

export const replicateJobStatusEnum = pgEnum(
    "replicate_job_status",
    REPLICATE_JOB_STATUSES
);

export const jobEventLevelEnum = pgEnum("job_event_level", JOB_EVENT_LEVELS);
export const jobEventSourceEnum = pgEnum("job_event_source", JOB_EVENT_SOURCES);

export const albumModesEnum = pgEnum("album_modes", ALBUM_MODES);

export const creditPackTierEnum = pgEnum("credit_pack_tier", CREDIT_PACK_TIERS);
export const creditPurchaseStatusEnum = pgEnum(
    "credit_purchase_status",
    CREDIT_PURCHASE_STATUSES
);

export const webhookProviderEnum = pgEnum("webhook_provider", WEBHOOK_PROVIDERS);
export const webhookProcessingStatusEnum = pgEnum(
    "webhook_processing_status",
    WEBHOOK_PROCESSING_STATUSES
);

export const accountLinkStatusEnum = pgEnum(
    "account_link_status",
    ACCOUNT_LINK_STATUSES
);

export const creditEventTypeEnum = pgEnum("credit_event_type", CREDIT_EVENT_TYPES);

/* ------------------------------- TABLES ------------------------------- */

export const users = pgTable(
    "users",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        email: text("email").notNull(),
        type: userTypeEnum("type").notNull().default("guest"),
        credits: integer("credits").notNull().default(0),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        emailUidx: uniqueIndex("users_email_uidx").on(t.email),
        typeIdx: index("users_type_idx").on(t.type),
    })
);

export const authSessions = pgTable(
    "auth_sessions",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        tokenHash: text("token_hash").notNull(),
        ip: text("ip").notNull(),
        userAgent: text("user_agent").notNull(),

        expiresAt: timestamp("expires_at", {withTimezone: true}).notNull(),
        revokedAt: timestamp("revoked_at", {withTimezone: true}),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        tokenHashUidx: uniqueIndex("auth_sessions_token_hash_uidx").on(t.tokenHash),
        userIdx: index("auth_sessions_user_idx").on(t.userId),
        userExpiresIdx: index("auth_sessions_user_expires_idx").on(t.userId, t.expiresAt),
    })
);

export const oauthAccounts = pgTable(
    "oauth_accounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        provider: text("provider").notNull(),
        providerAccountId: text("provider_account_id").notNull(),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        providerUidx: uniqueIndex("oauth_accounts_provider_uidx").on(
            t.provider,
            t.providerAccountId
        ),
        userIdx: index("oauth_accounts_user_idx").on(t.userId),
    })
);

export const authEmailCodes = pgTable(
    "auth_email_codes",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        email: text("email").notNull(),
        purpose: authEmailCodePurposeEnum("purpose").notNull(),

        codeHash: text("code_hash").notNull(),

        expiresAt: timestamp("expires_at", {withTimezone: true}).notNull(),
        consumedAt: timestamp("consumed_at", {withTimezone: true}),

        attempts: integer("attempts").notNull().default(0),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        emailPurposeIdx: index("auth_email_codes_email_purpose_idx").on(t.email, t.purpose),
        createdIdx: index("auth_email_codes_created_idx").on(t.createdAt),
    })
);

export const userEmailUpdates = pgTable(
    "user_email_updates",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        oldEmail: text("old_email").notNull(),
        newEmail: text("new_email").notNull(),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        userIdx: index("user_email_updates_user_idx").on(t.userId),
        newEmailIdx: index("user_email_updates_new_email_idx").on(t.newEmail),
    })
);

export const assets = pgTable(
    "assets",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        generatedFromAssetId: uuid("generated_from_asset_id"),

        type: assetTypeEnum("type").notNull(),

        fileKey: text("file_key").notNull(),
        title: text("title"),

        // date du souvenir (pas dérivée de createdAt)
        month: integer("month").notNull(),
        year: integer("year").notNull(),

        thumbnailKey: text("thumbnail_key"),
        deletedAt: timestamp("deleted_at", {withTimezone: true}),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        userDateIdx: index("assets_user_year_month_idx").on(t.userId, t.year, t.month),
        generatedFromIdx: index("assets_generated_from_idx").on(t.generatedFromAssetId),
        generatedFromAssetReference: foreignKey({
            columns: [t.generatedFromAssetId],
            foreignColumns: [t.id],
            name: 'generated_from_asset_id_fkey'
        })
    })
);

export const replicateGenerationJobs = pgTable(
    "replicate_generation_jobs",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        albumItemId: uuid("album_item_id")
            .references(() => albumItems.id, {onDelete: "cascade"}),

        createdByAssetId: uuid("created_by_asset_id")
            .notNull()
            .references(() => assets.id, {onDelete: "cascade"}),

        resultAssetId: uuid("result_asset_id").references(() => assets.id, {
            onDelete: "set null",
        }),

        model: text("model").notNull(),

        status: replicateJobStatusEnum("status").notNull(),

        progress: real("progress").notNull().default(0),
        progressMessage: text("progress_message"),

        replicatePredictionId: text("replicate_prediction_id"),
        replicateStatus: text("replicate_status"),
        replicateLog: text("replicate_log"),

        // si tu veux filtrer / grouper par "souvenir"
        month: integer("month").notNull(),
        year: integer("year").notNull(),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => ({
        userIdx: index("replicate_jobs_user_created_idx").on(t.userId, t.createdAt),
        createdByIdx: index("replicate_jobs_created_by_asset_idx").on(t.createdByAssetId),
        statusIdx: index("replicate_jobs_status_idx").on(t.status),
        createdIdx: index("replicate_jobs_created_idx").on(t.createdAt),

        // Si ReplicatePredictionId est un identifiant stable chez toi, tu peux activer l'unique :
        // predictionUidx: uniqueIndex("replicate_jobs_prediction_uidx").on(t.replicatePredictionId),
        predictionIdx: index("replicate_jobs_prediction_idx").on(t.replicatePredictionId),
    })
);

export const idempotencyKeys = pgTable(
    "idempotency_keys",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        provider: text("provider").notNull(), // ex: "replicate_create"
        key: text("key").notNull(),
        userId: uuid("user_id"),
        responseJson: jsonb("response_json"),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => ({
        uniqProviderKey: uniqueIndex("idempotency_provider_key_uidx").on(t.provider, t.key),
        userCreatedIdx: index("idempotency_user_created_idx").on(t.userId, t.createdAt),
    })
);

export const demoTrials = pgTable(
    "demo_trials",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        ipHash: text("ip_hash").notNull(),
        userId: uuid("user_id").notNull(),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => ({
        ipCreatedIdx: index("demo_trials_ip_created_idx").on(t.ipHash, t.createdAt),
    })
);

export const replicateGenerationJobEvents = pgTable(
    "replicate_generation_job_events",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        replicateGenerationJobId: uuid("replicate_generation_job_id")
            .notNull()
            .references(() => replicateGenerationJobs.id, {onDelete: "cascade"}),

        status: jobEventLevelEnum("status").notNull(),
        source: jobEventSourceEnum("source").notNull(),
        message: text("message").notNull(),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        jobIdx: index("replicate_job_events_job_idx").on(t.replicateGenerationJobId),
        jobCreatedIdx: index("replicate_job_events_job_created_idx").on(
            t.replicateGenerationJobId,
            t.createdAt
        ),
    })
);

/* ------------------------------- MUSIC ------------------------------- */

export const musics = pgTable(
    "musics",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        provider: text("provider").notNull(), // ex: "internal"
        title: text("title").notNull(),
        artist: text("artist"),

        durationSec: integer("duration_sec"),

        fileKey: text("file_key").notNull(),
        waveformKey: text("waveform_key"),

        isActive: boolean("is_active").notNull().default(true),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        activeIdx: index("musics_active_idx").on(t.isActive),
        createdIdx: index("musics_created_idx").on(t.createdAt),
    })
);

/* ------------------------------- ALBUMS ------------------------------- */

export const albums = pgTable(
    "albums",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        title: text("title").notNull().default("Untitled"),
        mode: albumModesEnum("mode").notNull().default("studio_help"),

        // N albums -> 1 music
        musicId: uuid("music_id").references(() => musics.id, {onDelete: "set null"}),

        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => ({
        userCreatedIdx: index("albums_user_created_idx").on(t.userId, t.createdAt),
    })
);

export const albumItems = pgTable(
    "album_items",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        albumId: uuid("album_id")
            .notNull()
            .references(() => albums.id, {onDelete: "cascade"}),

        assetId: uuid("asset_id")
            .notNull()
            .references(() => assets.id, {onDelete: "restrict"}),

        position: integer("position").notNull(),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => ({
        albumPosIdx: index("album_items_album_pos_idx").on(t.albumId, t.position),
        assetIdx: index("album_items_asset_idx").on(t.assetId),
        albumIdx: index("album_items_album_idx").on(t.albumId),
    })
);

export const exportJobStatusEnum = pgEnum("export_job_status", [
    "queued",
    "rendering",
    "done",
    "error",
]);

export const exportJobs = pgTable(
    "export_jobs",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        albumId: uuid("album_id")
            .notNull()
            .references(() => albums.id, {onDelete: "cascade"}),

        status: exportJobStatusEnum("status").notNull().default("queued"),
        progress: integer("progress").notNull().default(0),

        // résultat export (S3 privé)
        videoKey: text("video_key"),
        errorMessage: text("error_message"),

        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => ({
        userCreatedIdx: index("export_jobs_user_created_idx").on(t.userId, t.createdAt),
        albumCreatedIdx: index("export_jobs_album_created_idx").on(t.albumId, t.createdAt),
    })
);

/* ------------------------------- BILLING ------------------------------ */

export const creditPacks = pgTable(
    "credit_packs",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        tier: creditPackTierEnum("tier").notNull(),
        name: text("name").notNull(),
        subTitle: text("sub_title"),

        credits: integer("credits").notNull(),
        priceEur: integer("price_eur").notNull(),

        isActive: boolean("is_active").notNull().default(true),
        badge: text("badge"),

        benefits: text("benefits")
            .array()
            .notNull()
            .default(sql`'{}'::text[]`),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        tierIdx: index("credit_packs_tier_idx").on(t.tier),
        createdIdx: index("credit_packs_created_idx").on(t.createdAt),
    })
);

export const creditPurchases = pgTable(
    "credit_purchases",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        creditPackId: uuid("credit_pack_id").references(() => creditPacks.id, {
            onDelete: "set null",
        }),

        // snapshot “historique” (recommandé)
        creditsBought: integer("credits_bought").notNull(),
        amountEur: integer("amount_eur").notNull(),

        discountPercent: integer("discount_percent").notNull().default(0),

        status: creditPurchaseStatusEnum("status").notNull().default("created"),

        stripeCheckoutSessionId: text("stripe_checkout_session_id"),
        stripePaymentIntentId: text("stripe_payment_intent_id"),
        stripeCustomerId: text("stripe_customer_id"),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),

        paidAt: timestamp("paid_at", {withTimezone: true}),
    },
    (t) => ({
        userIdx: index("credit_purchases_user_idx").on(t.userId),
        packIdx: index("credit_purchases_pack_idx").on(t.creditPackId),
        statusIdx: index("credit_purchases_status_idx").on(t.status),

        // Idempotence Stripe (partial unique)
        // ⚠️ Si ton Drizzle ne supporte pas `.where(...)`, fais ces indexes en migration SQL.
        checkoutSessionUidx: uniqueIndex("credit_purchases_stripe_checkout_uidx")
            .on(t.stripeCheckoutSessionId)
            .where(sql`${t.stripeCheckoutSessionId}
            is not null`),

        paymentIntentUidx: uniqueIndex("credit_purchases_stripe_payment_intent_uidx")
            .on(t.stripePaymentIntentId)
            .where(sql`${t.stripePaymentIntentId}
            is not null`),
    })
);

/* ---------------------------- WEBHOOK EVENTS --------------------------- */

export const webhookEvents = pgTable(
    "webhook_events",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        provider: webhookProviderEnum("provider").notNull(),
        eventId: text("event_id").notNull(),
        type: text("type"),

        payload: jsonb("payload").notNull(),

        receivedAt: timestamp("received_at", {withTimezone: true})
            .notNull()
            .defaultNow(),

        processedAt: timestamp("processed_at", {withTimezone: true}),

        processingStatus: webhookProcessingStatusEnum("processing_status")
            .notNull()
            .default("received"),

        error: text("error"),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),

        relatedUserId: uuid("related_user_id").references(() => users.id, {onDelete: "set null"}),
        relatedPurchaseId: uuid("related_purchase_id").references(() => creditPurchases.id, {
            onDelete: "set null",
        }),
        relatedReplicateJobId: uuid("related_replicate_job_id").references(
            () => replicateGenerationJobs.id,
            {onDelete: "set null"}
        ),
    },
    (t) => ({
        providerEventUidx: uniqueIndex("webhook_events_provider_event_uidx").on(
            t.provider,
            t.eventId
        ),
        providerIdx: index("webhook_events_provider_idx").on(t.provider),
        statusIdx: index("webhook_events_status_idx").on(t.processingStatus),
        receivedIdx: index("webhook_events_received_idx").on(t.receivedAt),
    })
);

/* --------------------------- ACCOUNT LINKS ---------------------------- */

export const accountLinks = pgTable(
    "account_links",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        guestUserId: uuid("guest_user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        targetUserId: uuid("target_user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        status: accountLinkStatusEnum("status").notNull().default("pending"),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),

        completedAt: timestamp("completed_at", {withTimezone: true}),
    },
    (t) => ({
        guestIdx: index("account_links_guest_idx").on(t.guestUserId),
        targetIdx: index("account_links_target_idx").on(t.targetUserId),
        statusIdx: index("account_links_status_idx").on(t.status),

        guestPendingUidx: uniqueIndex("account_links_guest_pending_uidx")
            .on(t.guestUserId)
            .where(sql`${t.status}
            = 'pending'`),
    })
);

/* --------------------------- CREDIT EVENTS (AUDIT) --------------------- */

export const creditEvents = pgTable(
    "credit_events",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        type: creditEventTypeEnum("type").notNull(),
        delta: integer("delta").notNull(), // + / -

        // refs métiers (optionnelles)
        purchaseId: uuid("purchase_id").references(() => creditPurchases.id, {onDelete: "set null"}),
        albumExportJobId: uuid("album_export_job_id").references(() => exportJobs.id, {
            onDelete: "set null",
        }),
        replicateJobId: uuid("replicate_job_id").references(() => replicateGenerationJobs.id, {
            onDelete: "set null",
        }),

        note: text("note"),
        metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),

        createdAt: timestamp("created_at", {withTimezone: true})
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        userIdx: index("credit_events_user_idx").on(t.userId),
        createdIdx: index("credit_events_created_idx").on(t.createdAt),
        typeIdx: index("credit_events_type_idx").on(t.type),
    })
);

export const generationShares = pgTable(
    "generation_shares",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        generationJobId: uuid("generation_job_id")
            .notNull()
            .references(() => replicateGenerationJobs.id, {onDelete: "cascade"}),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),

        isActive: boolean("is_active").notNull().default(true),

        accessCount: integer("access_count").notNull().default(0),
        lastAccessedAt: timestamp("last_accessed_at", {withTimezone: true}),

        revokedAt: timestamp("revoked_at", {withTimezone: true}),

        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => ({
        genUid: uniqueIndex("generation_shares_generation_uidx").on(t.generationJobId),
        userCreatedIdx: index("generation_shares_user_created_idx").on(t.userId, t.createdAt),
    })
);
