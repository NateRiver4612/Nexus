DROP INDEX "conversations_project_idx";--> statement-breakpoint
DROP INDEX "messages_conversation_idx";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "seq" bigint NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "messages_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
CREATE INDEX "conversations_project_user_idx" ON "conversations" USING btree ("project_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_seq_idx" ON "messages" USING btree ("conversation_id","seq");