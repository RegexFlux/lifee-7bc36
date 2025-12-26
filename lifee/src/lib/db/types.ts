// src/lib/db/types.ts
import {
    webhookEvents,
    replicateGenerationJobs,
    assets,
    albumItems,
    creditEvents,
} from "@/lib/db/schema";

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;

export type ReplicateJob = typeof replicateGenerationJobs.$inferSelect;
export type NewReplicateJob = typeof replicateGenerationJobs.$inferInsert;
export type ReplicateJobStatus = ReplicateJob["status"];

export type Asset = typeof assets.$inferSelect;
export type AlbumItem = typeof albumItems.$inferSelect;

export type CreditEvent = typeof creditEvents.$inferSelect;
export type NewCreditEvent = typeof creditEvents.$inferInsert;
