ALTER TABLE "project_research" ADD COLUMN "input_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_research" ADD COLUMN "output_tokens" integer DEFAULT 0 NOT NULL;