CREATE TYPE "public"."asset_thumbnail_job_status" AS ENUM('queued', 'processing', 'done', 'error', 'skipped');--> statement-breakpoint
CREATE TABLE "asset_thumbnail_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"status" "asset_thumbnail_job_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"locked_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_thumbnail_jobs" ADD CONSTRAINT "asset_thumbnail_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_thumbnail_jobs" ADD CONSTRAINT "asset_thumbnail_jobs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_thumbnail_jobs_asset_uidx" ON "asset_thumbnail_jobs" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_thumbnail_jobs_status_created_idx" ON "asset_thumbnail_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "asset_thumbnail_jobs_user_created_idx" ON "asset_thumbnail_jobs" USING btree ("user_id","created_at");