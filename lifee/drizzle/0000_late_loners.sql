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
CREATE INDEX "lifee_job_events_job_idx" ON "lifee_job_events" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lifee_jobs_share_slug_uq" ON "lifee_jobs" USING btree ("share_slug");--> statement-breakpoint
CREATE INDEX "lifee_jobs_status_idx" ON "lifee_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lifee_jobs_created_idx" ON "lifee_jobs" USING btree ("created_at");