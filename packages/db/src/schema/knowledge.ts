import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';

import { idColumn, timestamps } from './columns';
import { projects } from './projects';
import { users } from './users';

export const documentStatus = pgEnum('document_status', [
  'pending',
  'processing',
  'ready',
  'failed',
]);

export const knowledgeCollections = pgTable(
  'knowledge_collections',
  {
    id: idColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => [index('knowledge_collections_project_idx').on(table.projectId)],
);

export type KnowledgeCollection = typeof knowledgeCollections.$inferSelect;
export type NewKnowledgeCollection = typeof knowledgeCollections.$inferInsert;

/**
 * Uploaded / imported knowledge sources.
 * The file bytes live in S3/MinIO; Postgres stores metadata + storage_key.
 */
export const documents = pgTable(
  'documents',
  {
    id: idColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    collectionId: uuid('collection_id').references(() => knowledgeCollections.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 128 }),
    storageKey: text('storage_key').notNull(),
    size: bigint('size', { mode: 'number' }).notNull().default(0),
    status: documentStatus('status').notNull().default('pending'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    index('documents_project_idx').on(table.projectId),
    index('documents_collection_idx').on(table.collectionId),
    index('documents_status_idx').on(table.status),
  ],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

/**
 * Documents are split into retrieval chunks. Each chunk may carry a pgvector
 * embedding (dimensions depend on the embedding model).
 */
export const documentChunks = pgTable(
  'document_chunks',
  {
    id: idColumn(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    chunkIndex: integer('chunk_index').notNull().default(0),
    metadata: jsonb('metadata')
      .$type<{ page?: number; heading?: string | null }>()
      .notNull()
      .default({}),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('document_chunks_document_idx').on(table.documentId, table.chunkIndex)],
);

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
