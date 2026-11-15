ALTER TABLE "artifacts" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
-- Backfill from the message that streamed each artifact. Latest reference wins.
WITH artifact_conversations AS (
	SELECT DISTINCT ON (a.id)
		a.id AS artifact_id,
		m.conversation_id
	FROM "messages" m
	CROSS JOIN LATERAL jsonb_array_elements(m.metadata -> 'artifacts') AS entry
	INNER JOIN "conversations" c ON c.id = m.conversation_id
	INNER JOIN "artifacts" a ON a.id::text = entry ->> 'id' AND a.project_id = c.project_id
	WHERE jsonb_typeof(m.metadata -> 'artifacts') = 'array'
	ORDER BY a.id, m.seq DESC
)
UPDATE "artifacts" a
SET conversation_id = ac.conversation_id
FROM artifact_conversations ac
WHERE a.id = ac.artifact_id
	AND a.conversation_id IS NULL;--> statement-breakpoint
-- Legacy rows with no message reference: nearest conversation created before the artifact.
UPDATE "artifacts" a
SET conversation_id = (
	SELECT c.id
	FROM "conversations" c
	WHERE c.project_id = a.project_id
		AND c.user_id = a.created_by
		AND c.created_at <= a.created_at
	ORDER BY c.created_at DESC
	LIMIT 1
)
WHERE a.conversation_id IS NULL;--> statement-breakpoint
-- Fall back to the creator's earliest conversation when no earlier one exists.
UPDATE "artifacts" a
SET conversation_id = (
	SELECT c.id
	FROM "conversations" c
	WHERE c.project_id = a.project_id
		AND c.user_id = a.created_by
	ORDER BY c.created_at ASC
	LIMIT 1
)
WHERE a.conversation_id IS NULL;--> statement-breakpoint
-- Last resort: create a conversation for imports so the column can be required.
INSERT INTO "conversations" (project_id, user_id, title)
SELECT DISTINCT a.project_id, a.created_by, 'Imported artifacts'
FROM "artifacts" a
WHERE a.conversation_id IS NULL
	AND NOT EXISTS (
		SELECT 1
		FROM "conversations" c
		WHERE c.project_id = a.project_id
			AND c.user_id = a.created_by
	);--> statement-breakpoint
UPDATE "artifacts" a
SET conversation_id = (
	SELECT c.id
	FROM "conversations" c
	WHERE c.project_id = a.project_id
		AND c.user_id = a.created_by
	ORDER BY c.created_at ASC
	LIMIT 1
)
WHERE a.conversation_id IS NULL;--> statement-breakpoint
ALTER TABLE "artifacts" ALTER COLUMN "conversation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifacts_conversation_name_idx" ON "artifacts" USING btree ("conversation_id","name");
