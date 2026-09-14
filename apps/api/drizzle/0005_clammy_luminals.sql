ALTER TABLE "deliverables" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "is_system" boolean DEFAULT true NOT NULL;