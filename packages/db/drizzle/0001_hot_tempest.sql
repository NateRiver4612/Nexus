DROP INDEX "project_onboarding_unique_idx";--> statement-breakpoint
ALTER TABLE "project_onboarding" ALTER COLUMN "step_data" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "project_onboarding_unique_idx" ON "project_onboarding" USING btree ("user_id","name");