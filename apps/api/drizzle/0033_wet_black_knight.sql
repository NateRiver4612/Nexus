CREATE TYPE "public"."thumbnail_status" AS ENUM('pending', 'processing', 'ready', 'failed', 'unavailable');--> statement-breakpoint
CREATE TABLE "thumbnails" (
	"storage_key" text PRIMARY KEY NOT NULL,
	"status" "thumbnail_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
