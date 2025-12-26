ALTER TABLE "auth_sessions" ALTER COLUMN "ip" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_sessions" ALTER COLUMN "user_agent" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_thumbnail_jobs" ADD COLUMN "next_attempt_at" timestamp with time zone;