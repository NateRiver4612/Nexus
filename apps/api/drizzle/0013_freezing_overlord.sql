CREATE TYPE "public"."project_category" AS ENUM('marketing', 'finance', 'research', 'engineering', 'personal');--> statement-breakpoint
ALTER TYPE "public"."project_status" ADD VALUE 'completed';--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "status" SET DEFAULT 'planned'::text;--> statement-breakpoint
DROP TYPE "public"."milestone_status";--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('planned', 'active', 'completed');--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "status" SET DEFAULT 'planned'::"public"."milestone_status";--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "status" SET DATA TYPE "public"."milestone_status" USING "status"::"public"."milestone_status";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "project_category" "project_category" NOT NULL;