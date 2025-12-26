// src/lib/db/types.ts
import {
    webhookEvents,
    replicateGenerationJobs,
    assets,
    albumItems,
    creditEvents,
    replicateGenerationJobEvents, albums, exportJobs, generationShares, assetThumbnailJobs
} from "@/lib/db/schema";
import {InferInsertModel, InferSelectModel} from "drizzle-orm";

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;

export type ReplicateJob = typeof replicateGenerationJobs.$inferSelect;
export type NewReplicateJob = typeof replicateGenerationJobs.$inferInsert;
export type ReplicateJobStatus = ReplicateJob["status"];

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type AlbumItem = typeof albumItems.$inferSelect;
export type NewAlbumItem = typeof albumItems.$inferInsert;

export type CreditEvent = typeof creditEvents.$inferSelect;
export type NewCreditEvent = typeof creditEvents.$inferInsert;

export type ReplicateJobEvent = typeof replicateGenerationJobEvents.$inferSelect;
export type NewReplicateJobEvent = typeof replicateGenerationJobEvents.$inferInsert;

export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;

export type AssetRow = InferSelectModel<typeof assets>;
export type NewAssetRow = InferInsertModel<typeof assets>;

export type AssetThumbnailJobRow = InferSelectModel<typeof assetThumbnailJobs>;
export type NewAssetThumbnailJobRow = InferInsertModel<typeof assetThumbnailJobs>;

export type ExportJob = typeof exportJobs.$inferSelect;
export type NewExportJob = typeof exportJobs.$inferInsert;
export type ExportJobStatus = ExportJob["status"];

export type GenerationShare = typeof generationShares.$inferSelect;
export type NewGenerationShare = typeof generationShares.$inferInsert;