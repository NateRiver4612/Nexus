CREATE TYPE "public"."ai_task" AS ENUM('rewrite', 'summarize', 'classify', 'project-chat', 'kickoff', 'research', 'artifact-generation', 'project-health');--> statement-breakpoint
ALTER TABLE "ai_runs" RENAME COLUMN "type" TO "ai_task";--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;