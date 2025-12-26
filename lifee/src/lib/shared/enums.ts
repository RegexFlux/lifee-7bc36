// src/lib/shared/enums.ts
export const USER_TYPES = ["guest", "normal"] as const;

export const AUTH_EMAIL_CODE_PURPOSES = [
    "login",
    "change_email",
    "link_guest",
    "merge_into_existing",
] as const;

export const ASSET_TYPES = ["image", "video"] as const;

export const REPLICATE_JOB_STATUSES = [
    "uploading",
    "queued",
    "starting",
    "processing",
    "succeeded",
    "failed",
    "canceled",
] as const;

export const JOB_EVENT_LEVELS = ["info", "warn", "error"] as const;
export const JOB_EVENT_SOURCES = ["server", "replicate"] as const;

export const ALBUM_STATUSES = ["draft", "exported"] as const;

export const CREDIT_PACK_TIERS = ["standard", "creator"] as const;

export const CREDIT_PURCHASE_STATUSES = ["created", "paid", "failed", "refunded"] as const;

export const WEBHOOK_PROVIDERS = ["stripe", "replicate"] as const;
export const WEBHOOK_PROCESSING_STATUSES = ["received", "processed", "failed"] as const;

export const ACCOUNT_LINK_STATUSES = ["pending", "completed", "cancelled"] as const;

// Audit-only (pas source of truth)
export const CREDIT_EVENT_TYPES = ["purchase", "spend", "refund", "admin_adjust"] as const;
