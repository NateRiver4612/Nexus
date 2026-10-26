CREATE TYPE "public"."ai_run_stage" AS ENUM('researching', 'drafting_milestones', 'drafting_summary', 'gathering_context', 'drafting_artifact', 'rendering_artifact', 'saving_artifact', 'analyzing_project', 'retrying');--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "stage" "ai_run_stage";--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "stage_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "ai_runs_active_idx" ON "ai_runs" USING btree ("updated_at") WHERE "ai_runs"."status" in ('queued', 'processing');