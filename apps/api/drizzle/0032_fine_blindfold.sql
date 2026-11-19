ALTER TYPE "public"."artifact_type" ADD VALUE 'image';--> statement-breakpoint
ALTER TYPE "public"."artifact_type" ADD VALUE 'audio';--> statement-breakpoint
ALTER TYPE "public"."artifact_type" ADD VALUE 'video';--> statement-breakpoint
ALTER TYPE "public"."artifact_type" ADD VALUE 'file';--> statement-breakpoint
ALTER TABLE "artifact_versions" ADD COLUMN "source_attachment_id" uuid;--> statement-breakpoint
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_source_attachment_id_conversation_attachments_id_fk" FOREIGN KEY ("source_attachment_id") REFERENCES "public"."conversation_attachments"("id") ON DELETE set null ON UPDATE no action;