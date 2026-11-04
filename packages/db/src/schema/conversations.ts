import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { idColumn, timestamps } from './columns';
import { projects } from './projects';
import { users } from './users';

export type MessageMetadata = Record<string, unknown>;

export const messageRole = pgEnum('message_role', ['user', 'assistant', 'system']);

/**
 * AI conversations are project-scoped.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: idColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull().default('New conversation'),
    ...timestamps,
  },
  (table) => [
    index('conversations_project_user_idx').on(table.projectId, table.userId, table.updatedAt),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export const messages = pgTable(
  'messages',
  {
    id: idColumn(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRole('role').notNull(),
    content: text('content').notNull(),
    sourceId: text('source_id'), // optional reference to an artifact/document
    // Insertion order. created_at ties inside a transaction and uuids are random, so page on this.
    seq: bigint('seq', { mode: 'number' }).generatedAlwaysAsIdentity().notNull(),
    metadata: jsonb('metadata').$type<MessageMetadata>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_conversation_seq_idx').on(table.conversationId, table.seq)],
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
