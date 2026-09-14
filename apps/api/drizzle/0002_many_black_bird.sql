ALTER TABLE "project_onboarding" DROP CONSTRAINT "project_onboarding_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "project_onboarding" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_onboarding" ADD CONSTRAINT "project_onboarding_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;