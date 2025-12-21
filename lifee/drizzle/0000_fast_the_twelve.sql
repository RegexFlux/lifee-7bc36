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
	"id" text PRIMARY KEY NOT NULL,
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
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_login_codes_email_idx" ON "email_login_codes" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "lifee_job_events_job_idx" ON "lifee_job_events" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lifee_jobs_share_slug_uq" ON "lifee_jobs" USING btree ("share_slug");--> statement-breakpoint
CREATE INDEX "lifee_jobs_status_idx" ON "lifee_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lifee_jobs_created_idx" ON "lifee_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");