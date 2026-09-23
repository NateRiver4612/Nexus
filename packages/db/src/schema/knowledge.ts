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

export const sourceStatus = pgEnum('source_status', ['pending', 'processing', 'ready', 'failed']);

export const sourceType = pgEnum('source_type', [
  'file',
  'url',
  'youtube',
  'copied_text',
  'audio',
  'video',
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
export const knowledgeSources = pgTable(
  'knowledge_sources',
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
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull().default(0),
    sourceRef: text('source_ref'),
    sourceType: sourceType('source_type').notNull().default('file'),
    storageKey: text('storage_key'),
    content: text('content'),
    errorMessage: text('error_message'),
    status: sourceStatus('status').notNull().default('pending'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    index('knowledge_sources_project_idx').on(table.projectId),
    index('knowledge_sources_collection_idx').on(table.collectionId),
    index('knowledge_sources_status_idx').on(table.status),
  ],
);

export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type NewKnowledgeSource = typeof knowledgeSources.$inferInsert;

/**
 * Sources are split into retrieval chunks. Each chunk may carry a pgvector
 * embedding (dimensions depend on the embedding model).
 */
export const knowledgeSourceChunks = pgTable(
  'knowledge_source_chunks',
  {
    id: idColumn(),
    knowledgeSourceId: uuid('knowledge_source_id')
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    chunkIndex: integer('chunk_index').notNull().default(0),
    metadata: jsonb('metadata')
      .$type<{ page?: number; heading?: string | null }>()
      .notNull()
      .default({}),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    embeddingIdx: index('embeddingIndex').using('hnsw', table.embedding.op('vector_cosine_ops')),
    projectIdx: index('knowledge_source_chunks_project_idx').on(table.projectId),
  }),
);

export type KnowledgeSourceChunk = typeof knowledgeSourceChunks.$inferSelect;
export type NewKnowledgeSourceChunk = typeof knowledgeSourceChunks.$inferInsert;
