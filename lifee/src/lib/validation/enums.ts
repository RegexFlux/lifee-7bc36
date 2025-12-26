// src/lib/validation/enums.ts
import {z} from "zod";
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

export const zUserType = z.enum(USER_TYPES);
export const zAuthEmailCodePurpose = z.enum(AUTH_EMAIL_CODE_PURPOSES);
export const zAssetType = z.enum(ASSET_TYPES);

export const zReplicateJobStatus = z.enum(REPLICATE_JOB_STATUSES);
export const zJobEventLevel = z.enum(JOB_EVENT_LEVELS);
export const zJobEventSource = z.enum(JOB_EVENT_SOURCES);

export const zAlbumModes = z.enum(ALBUM_MODES);

export const zCreditPackTier = z.enum(CREDIT_PACK_TIERS);
export const zCreditPurchaseStatus = z.enum(CREDIT_PURCHASE_STATUSES);

export const zWebhookProvider = z.enum(WEBHOOK_PROVIDERS);
export const zWebhookProcessingStatus = z.enum(WEBHOOK_PROCESSING_STATUSES);

export const zAccountLinkStatus = z.enum(ACCOUNT_LINK_STATUSES);
export const zCreditEventType = z.enum(CREDIT_EVENT_TYPES);

export const zReplicateStatus = z.enum([
    "starting",
    "processing",
    "succeeded",
    "failed",
    "canceled",
]);
