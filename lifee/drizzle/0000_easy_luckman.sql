CREATE TYPE "public"."account_link_status" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."album_modes" AS ENUM('studio_pro', 'studio_help');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."auth_email_code_purpose" AS ENUM('login', 'change_email', 'link_guest', 'merge_into_existing');--> statement-breakpoint
CREATE TYPE "public"."credit_event_type" AS ENUM('purchase', 'spend', 'refund', 'admin_adjust');--> statement-breakpoint
CREATE TYPE "public"."credit_pack_tier" AS ENUM('standard', 'creator');--> statement-breakpoint
CREATE TYPE "public"."credit_purchase_status" AS ENUM('created', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."export_job_status" AS ENUM('queued', 'rendering', 'done', 'error');--> statement-breakpoint
CREATE TYPE "public"."job_event_level" AS ENUM('info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."job_event_source" AS ENUM('server', 'replicate');--> statement-breakpoint
CREATE TYPE "public"."replicate_job_status" AS ENUM('uploading', 'queued', 'starting', 'processing', 'succeeded', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('guest', 'normal');--> statement-breakpoint
CREATE TYPE "public"."webhook_processing_status" AS ENUM('received', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."webhook_provider" AS ENUM('stripe', 'replicate');--> statement-breakpoint
CREATE TABLE "account_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"status" "account_link_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "album_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"mode" "album_modes" DEFAULT 'studio_help' NOT NULL,
	"music_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"generated_from_asset_id" uuid,
	"type" "asset_type" NOT NULL,
	"file_key" text NOT NULL,
	"title" text,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"thumbnail_key" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_email_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"purpose" "auth_email_code_purpose" NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"ip" text NOT NULL,
	"user_agent" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "credit_event_type" NOT NULL,
	"delta" integer NOT NULL,
	"purchase_id" uuid,
	"album_export_job_id" uuid,
	"replicate_job_id" uuid,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" "credit_pack_tier" NOT NULL,
	"name" text NOT NULL,
	"sub_title" text,
	"credits" integer NOT NULL,
	"price_eur" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"badge" text,
	"benefits" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credit_pack_id" uuid,
	"credits_bought" integer NOT NULL,
	"amount_eur" integer NOT NULL,
	"discount_percent" integer DEFAULT 0 NOT NULL,
	"status" "credit_purchase_status" DEFAULT 'created' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "demo_trials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"album_id" uuid NOT NULL,
	"status" "export_job_status" DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"video_key" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_job_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"key" text NOT NULL,
	"user_id" uuid,
	"response_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "musics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"title" text NOT NULL,
	"artist" text,
	"duration_sec" integer,
	"file_key" text NOT NULL,
	"waveform_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replicate_generation_job_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"replicate_generation_job_id" uuid NOT NULL,
	"status" "job_event_level" NOT NULL,
	"source" "job_event_source" NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replicate_generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"album_item_id" uuid,
	"created_by_asset_id" uuid NOT NULL,
	"result_asset_id" uuid,
	"model" text NOT NULL,
	"status" "replicate_job_status" NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"progress_message" text,
	"replicate_prediction_id" text,
	"replicate_status" text,
	"replicate_log" text,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_email_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"old_email" text NOT NULL,
	"new_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"type" "user_type" DEFAULT 'guest' NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "webhook_provider" NOT NULL,
	"event_id" text NOT NULL,
	"type" text,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_status" "webhook_processing_status" DEFAULT 'received' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"related_user_id" uuid,
	"related_purchase_id" uuid,
	"related_replicate_job_id" uuid
);
--> statement-breakpoint
ALTER TABLE "account_links" ADD CONSTRAINT "account_links_guest_user_id_users_id_fk" FOREIGN KEY ("guest_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_links" ADD CONSTRAINT "account_links_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_items" ADD CONSTRAINT "album_items_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_items" ADD CONSTRAINT "album_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_music_id_musics_id_fk" FOREIGN KEY ("music_id") REFERENCES "public"."musics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "generated_from_asset_id_fkey" FOREIGN KEY ("generated_from_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_purchase_id_credit_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."credit_purchases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_album_export_job_id_export_jobs_id_fk" FOREIGN KEY ("album_export_job_id") REFERENCES "public"."export_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_replicate_job_id_replicate_generation_jobs_id_fk" FOREIGN KEY ("replicate_job_id") REFERENCES "public"."replicate_generation_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_credit_pack_id_credit_packs_id_fk" FOREIGN KEY ("credit_pack_id") REFERENCES "public"."credit_packs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_shares" ADD CONSTRAINT "generation_shares_generation_job_id_replicate_generation_jobs_id_fk" FOREIGN KEY ("generation_job_id") REFERENCES "public"."replicate_generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_shares" ADD CONSTRAINT "generation_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replicate_generation_job_events" ADD CONSTRAINT "replicate_generation_job_events_replicate_generation_job_id_replicate_generation_jobs_id_fk" FOREIGN KEY ("replicate_generation_job_id") REFERENCES "public"."replicate_generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replicate_generation_jobs" ADD CONSTRAINT "replicate_generation_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replicate_generation_jobs" ADD CONSTRAINT "replicate_generation_jobs_album_item_id_album_items_id_fk" FOREIGN KEY ("album_item_id") REFERENCES "public"."album_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replicate_generation_jobs" ADD CONSTRAINT "replicate_generation_jobs_created_by_asset_id_assets_id_fk" FOREIGN KEY ("created_by_asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replicate_generation_jobs" ADD CONSTRAINT "replicate_generation_jobs_result_asset_id_assets_id_fk" FOREIGN KEY ("result_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_email_updates" ADD CONSTRAINT "user_email_updates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_related_user_id_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_related_purchase_id_credit_purchases_id_fk" FOREIGN KEY ("related_purchase_id") REFERENCES "public"."credit_purchases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_related_replicate_job_id_replicate_generation_jobs_id_fk" FOREIGN KEY ("related_replicate_job_id") REFERENCES "public"."replicate_generation_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_links_guest_idx" ON "account_links" USING btree ("guest_user_id");--> statement-breakpoint
CREATE INDEX "account_links_target_idx" ON "account_links" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "account_links_status_idx" ON "account_links" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "account_links_guest_pending_uidx" ON "account_links" USING btree ("guest_user_id") WHERE "account_links"."status"
            = 'pending';--> statement-breakpoint
CREATE INDEX "album_items_album_pos_idx" ON "album_items" USING btree ("album_id","position");--> statement-breakpoint
CREATE INDEX "album_items_asset_idx" ON "album_items" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "album_items_album_idx" ON "album_items" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "albums_user_created_idx" ON "albums" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "assets_user_year_month_idx" ON "assets" USING btree ("user_id","year","month");--> statement-breakpoint
CREATE INDEX "assets_generated_from_idx" ON "assets" USING btree ("generated_from_asset_id");--> statement-breakpoint
CREATE INDEX "auth_email_codes_email_purpose_idx" ON "auth_email_codes" USING btree ("email","purpose");--> statement-breakpoint
CREATE INDEX "auth_email_codes_created_idx" ON "auth_email_codes" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_uidx" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_expires_idx" ON "auth_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "credit_events_user_idx" ON "credit_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_events_created_idx" ON "credit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_events_type_idx" ON "credit_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "credit_packs_tier_idx" ON "credit_packs" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "credit_packs_created_idx" ON "credit_packs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_purchases_user_idx" ON "credit_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_purchases_pack_idx" ON "credit_purchases" USING btree ("credit_pack_id");--> statement-breakpoint
CREATE INDEX "credit_purchases_status_idx" ON "credit_purchases" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_purchases_stripe_checkout_uidx" ON "credit_purchases" USING btree ("stripe_checkout_session_id") WHERE "credit_purchases"."stripe_checkout_session_id"
            is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_purchases_stripe_payment_intent_uidx" ON "credit_purchases" USING btree ("stripe_payment_intent_id") WHERE "credit_purchases"."stripe_payment_intent_id"
            is not null;--> statement-breakpoint
CREATE INDEX "demo_trials_ip_created_idx" ON "demo_trials" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "export_jobs_user_created_idx" ON "export_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "export_jobs_album_created_idx" ON "export_jobs" USING btree ("album_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_shares_generation_uidx" ON "generation_shares" USING btree ("generation_job_id");--> statement-breakpoint
CREATE INDEX "generation_shares_user_created_idx" ON "generation_shares" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_provider_key_uidx" ON "idempotency_keys" USING btree ("provider","key");--> statement-breakpoint
CREATE INDEX "idempotency_user_created_idx" ON "idempotency_keys" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "musics_active_idx" ON "musics" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "musics_created_idx" ON "musics" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_provider_uidx" ON "oauth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "replicate_job_events_job_idx" ON "replicate_generation_job_events" USING btree ("replicate_generation_job_id");--> statement-breakpoint
CREATE INDEX "replicate_job_events_job_created_idx" ON "replicate_generation_job_events" USING btree ("replicate_generation_job_id","created_at");--> statement-breakpoint
CREATE INDEX "replicate_jobs_user_created_idx" ON "replicate_generation_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "replicate_jobs_created_by_asset_idx" ON "replicate_generation_jobs" USING btree ("created_by_asset_id");--> statement-breakpoint
CREATE INDEX "replicate_jobs_status_idx" ON "replicate_generation_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "replicate_jobs_created_idx" ON "replicate_generation_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "replicate_jobs_prediction_idx" ON "replicate_generation_jobs" USING btree ("replicate_prediction_id");--> statement-breakpoint
CREATE INDEX "user_email_updates_user_idx" ON "user_email_updates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_email_updates_new_email_idx" ON "user_email_updates" USING btree ("new_email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_type_idx" ON "users" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_event_uidx" ON "webhook_events" USING btree ("provider","event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_provider_idx" ON "webhook_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_events_status_idx" ON "webhook_events" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "webhook_events_received_idx" ON "webhook_events" USING btree ("received_at");