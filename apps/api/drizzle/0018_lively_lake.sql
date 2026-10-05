CREATE TABLE "task_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"title" varchar(255) DEFAULT 'Untitled' NOT NULL,
	"content" jsonb NOT NULL,
	"content_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_notes_task_idx" ON "task_notes" USING btree ("task_id","created_at");