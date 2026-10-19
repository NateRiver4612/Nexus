CREATE TYPE "public"."research_status" AS ENUM('completed', 'in_progress', 'failed', 'pending');--> statement-breakpoint
CREATE TABLE "project_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"status" "research_status" DEFAULT 'pending' NOT NULL,
	"provider" varchar(50) DEFAULT 'tavily' NOT NULL,
	"model" varchar(20) NOT NULL,
	"request_id" varchar(100),
	"prompt" text NOT NULL,
	"content" jsonb,
	"sources" jsonb,
	"credits_used" integer,
	"error_message" text,
	"response_time" integer,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"ai_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_research" ADD CONSTRAINT "project_research_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_research" ADD CONSTRAINT "project_research_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "public"."ai_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_research_project_idx" ON "project_research" USING btree ("project_id");