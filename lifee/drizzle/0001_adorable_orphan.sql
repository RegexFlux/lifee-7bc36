ALTER TABLE "credit_purchases" ADD COLUMN "promo_code" text;--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD COLUMN "promo_source" text;--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD COLUMN "discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD COLUMN "draft_id" uuid;