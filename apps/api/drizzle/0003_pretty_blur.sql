ALTER TABLE "project_onboarding" ALTER COLUMN "onboarding_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "project_onboarding" ALTER COLUMN "onboarding_status" SET DEFAULT 'in_progress'::text;--> statement-breakpoint
DROP TYPE "public"."project_onboarding_status";--> statement-breakpoint
CREATE TYPE "public"."project_onboarding_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
ALTER TABLE "project_onboarding" ALTER COLUMN "onboarding_status" SET DEFAULT 'in_progress'::"public"."project_onboarding_status";--> statement-breakpoint
ALTER TABLE "project_onboarding" ALTER COLUMN "onboarding_status" SET DATA TYPE "public"."project_onboarding_status" USING "onboarding_status"::"public"."project_onboarding_status";--> statement-breakpoint
DROP INDEX "project_onboarding_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "project_onboarding_unique_idx" ON "project_onboarding" USING btree ("user_id","project_id");--> statement-breakpoint
ALTER TABLE "project_onboarding" DROP COLUMN "name";