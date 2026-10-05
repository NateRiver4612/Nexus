ALTER TABLE "projects" RENAME COLUMN "created_by" TO "user_id";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "project_members" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "project_onboarding" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "project_onboarding" ADD CONSTRAINT "project_onboarding_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;