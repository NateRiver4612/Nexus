DROP INDEX "tasks_due_date_idx";--> statement-breakpoint
ALTER TABLE "project_onboarding" ADD COLUMN "ai_run" uuid;--> statement-breakpoint
ALTER TABLE "project_onboarding" ADD CONSTRAINT "project_onboarding_ai_run_ai_runs_id_fk" FOREIGN KEY ("ai_run") REFERENCES "public"."ai_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" DROP COLUMN "due_date";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "due_date";