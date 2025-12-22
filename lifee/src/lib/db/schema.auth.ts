import { pgTable, text, timestamp, integer, uuid, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";


// Recommandé: user id = UUID interne (indépendant de l’email)
export const appUsers = pgTable(
    "app_users",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        email: text("email").notNull(),
        credits: integer("credits").notNull().default(3),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => ({
        emailUx: uniqueIndex("app_users_email_ux").on(t.email),
    })
);

// OTP email (code 6 chiffres hashé)
export const authEmailCodes = pgTable(
    "auth_email_codes",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        email: text("email").notNull(),
        codeHash: text("code_hash").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        consumedAt: timestamp("consumed_at"),
        attempts: integer("attempts").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => ({
        emailIdx: index("auth_email_codes_email_idx").on(t.email),
    })
);

// Session httpOnly cookie (token random -> hash en DB)
export const authSessions = pgTable(
    "auth_sessions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
        tokenHash: text("token_hash").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        revokedAt: timestamp("revoked_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => ({
        tokenUx: uniqueIndex("auth_sessions_token_hash_ux").on(t.tokenHash),
        userIdx: index("auth_sessions_user_idx").on(t.userId),
    })
);

// Lien OAuth (Google)
export const oauthAccounts = pgTable(
    "oauth_accounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        provider: text("provider").notNull(), // "google"
        providerAccountId: text("provider_account_id").notNull(), // sub
        userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => ({
        ux: uniqueIndex("oauth_accounts_provider_ux").on(t.provider, t.providerAccountId),
        userIdx: index("oauth_accounts_user_idx").on(t.userId),
    })
);

// Pour éviter d’importer le même jobId 20 fois dans la bibliothèque
export const studioJobImports = pgTable(
    "studio_job_imports",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
        jobId: text("job_id").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => ({
        ux: uniqueIndex("studio_job_imports_ux").on(t.userId, t.jobId),
    })
);
