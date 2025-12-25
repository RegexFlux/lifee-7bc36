CREATE TABLE "email_login_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifee_daily_runs" (
	"day" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifee_ip_attempts" (
	"ip_hash" text NOT NULL,
	"scope_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"job_id" text NOT NULL,
	CONSTRAINT "lifee_ip_attempts_ip_hash_scope_key_pk" PRIMARY KEY("ip_hash","scope_key")
);
--> statement-breakpoint
CREATE TABLE "lifee_job_events" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifee_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"share_slug" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"progress" real,
	"progress_message" text,
	"prompt" text,
	"email" text,
	"replicate_prediction_id" text,
	"replicate_status" text,
	"replicate_logs" text,
	"replicate_output_url" text,
	"image_key" text,
	"video_key" text,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"credits" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_email_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_job_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"url" text,
	"music_track_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"duration" text NOT NULL,
	"genre" text NOT NULL,
	"preview_url" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"duration_sec" integer,
	"file_key" text NOT NULL,
	"thumbnail_key" text,
	"is_generated" boolean DEFAULT false NOT NULL,
	"context" text,
	"generated_from_asset_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"source" text DEFAULT 'library' NOT NULL,
	"context" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"ref_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pack_id" text NOT NULL,
	"credits_bought" integer NOT NULL,
	"bonus_credits" integer DEFAULT 0 NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "album_draft_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "album_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "album_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"source_asset_id" uuid NOT NULL,
	"video_asset_id" uuid,
	"job_id" text,
	"position" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "album_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"draft_id" uuid,
	"status" text DEFAULT 'generating' NOT NULL,
	"pack_id" text,
	"required_credits" integer DEFAULT 0 NOT NULL,
	"export_job_id" uuid,
	"final_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_job_imports" ADD CONSTRAINT "studio_job_imports_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_assets" ADD CONSTRAINT "studio_assets_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_clips" ADD CONSTRAINT "timeline_clips_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_clips" ADD CONSTRAINT "timeline_clips_asset_id_studio_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."studio_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_draft_items" ADD CONSTRAINT "album_draft_items_draft_id_album_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."album_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_draft_items" ADD CONSTRAINT "album_draft_items_asset_id_studio_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."studio_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_drafts" ADD CONSTRAINT "album_drafts_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_order_items" ADD CONSTRAINT "album_order_items_order_id_album_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."album_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_order_items" ADD CONSTRAINT "album_order_items_source_asset_id_studio_assets_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."studio_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_order_items" ADD CONSTRAINT "album_order_items_video_asset_id_studio_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "public"."studio_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_orders" ADD CONSTRAINT "album_orders_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_orders" ADD CONSTRAINT "album_orders_draft_id_album_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."album_drafts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_orders" ADD CONSTRAINT "album_orders_export_job_id_export_jobs_id_fk" FOREIGN KEY ("export_job_id") REFERENCES "public"."export_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_login_codes_email_idx" ON "email_login_codes" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "lifee_job_events_job_idx" ON "lifee_job_events" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lifee_jobs_share_slug_uq" ON "lifee_jobs" USING btree ("share_slug");--> statement-breakpoint
CREATE INDEX "lifee_jobs_status_idx" ON "lifee_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lifee_jobs_created_idx" ON "lifee_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_ux" ON "app_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auth_email_codes_email_idx" ON "auth_email_codes" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_ux" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_provider_ux" ON "oauth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_job_imports_ux" ON "studio_job_imports" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "export_jobs_user_idx" ON "export_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "studio_assets_user_idx" ON "studio_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "studio_assets_user_created_idx" ON "studio_assets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "timeline_clips_user_idx" ON "timeline_clips" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "timeline_clips_user_pos_idx" ON "timeline_clips" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_idx" ON "credit_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_ledger_unique_ref" ON "credit_ledger" USING btree ("user_id","reason","ref_id");--> statement-breakpoint
CREATE INDEX "credit_purchases_user_idx" ON "credit_purchases" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_purchases_checkout_uq" ON "credit_purchases" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_purchases_pi_uq" ON "credit_purchases" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "album_draft_items_draft_pos_idx" ON "album_draft_items" USING btree ("draft_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "album_draft_items_unique" ON "album_draft_items" USING btree ("draft_id","asset_id");--> statement-breakpoint
CREATE INDEX "album_drafts_user_idx" ON "album_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "album_drafts_user_updated_idx" ON "album_drafts" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "album_order_items_order_idx" ON "album_order_items" USING btree ("order_id","position");--> statement-breakpoint
CREATE INDEX "album_order_items_job_idx" ON "album_order_items" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "album_orders_user_idx" ON "album_orders" USING btree ("user_id","created_at");