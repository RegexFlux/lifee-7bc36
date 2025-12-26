CREATE TABLE "export_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"export_job_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "export_shares" ADD CONSTRAINT "export_shares_export_job_id_export_jobs_id_fk" FOREIGN KEY ("export_job_id") REFERENCES "public"."export_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_shares" ADD CONSTRAINT "export_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "export_shares_export_job_idx" ON "export_shares" USING btree ("export_job_id");--> statement-breakpoint
CREATE INDEX "export_shares_user_idx" ON "export_shares" USING btree ("user_id");