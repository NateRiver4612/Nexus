CREATE TYPE "public"."task_difficulty" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
ALTER TABLE "project_progress" ADD COLUMN "progress_percentage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "difficulty" "task_difficulty" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "estimated_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "actual_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "instructions" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "priority";--> statement-breakpoint
DROP TYPE "public"."task_priority";