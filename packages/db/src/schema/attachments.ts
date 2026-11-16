import { bigint, index, pgEnum, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';

import { idColumn, timestamps } from './columns';
import { conversations, messages } from './conversations';
import { users } from './users';

export const attachmentStatus = pgEnum('attachment_status', [
  'uploaded',
  'processing',
  'ready',
  'failed',
]);

/**
 * Files attached to a chat message so the assistant can answer from them that turn.
 * Conversation-scoped like the messages they attach to: bytes live in S3 while Postgres
 * stores metadata, the extracted text, and the link to the message that used them.
 */
export const conversationAttachments = pgTable(
  'conversation_attachments',
  {
    id: idColumn(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    // Null while the attachment is still a draft (uploaded/processing) and not yet sent.
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 128 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull().default(0),
    storageKey: text('storage_key').notNull(),
    status: attachmentStatus('status').notNull().default('uploaded'),
    extractedText: text('extracted_text'),
    errorMessage: text('error_message'),
    ...timestamps,
  },
  (table) => [
    index('conversation_attachments_conversation_message_idx').on(
      table.conversationId,
      table.messageId,
    ),
  ],
);

export type ConversationAttachment = typeof conversationAttachments.$inferSelect;
export type NewConversationAttachment = typeof conversationAttachments.$inferInsert;
