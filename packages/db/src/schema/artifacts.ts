import {
  bigint,
  index,
  integer,
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

export const artifactType = pgEnum('artifact_type', [
  'report',
  'presentation',
  'spreadsheet',
  'proposal',
  'pdf',
  'document',
  'diagram',
  'study_guide',
]);

export const artifactStatus = pgEnum('artifact_status', [
  'queued',
  'generating',
  'ready',
  'failed',
]);

/**
 * Artifacts are first-class project assets. Files are versioned rather than
 * overwritten; bytes live in S3 while Postgres stores metadata.
 */
export const artifacts = pgTable(
  'artifacts',
  {
    id: idColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: artifactType('type').notNull(),
    status: artifactStatus('status').notNull().default('queued'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    index('artifacts_project_idx').on(table.projectId),
    index('artifacts_type_idx').on(table.type),
  ],
);

export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;

export const artifactVersions = pgTable(
  'artifact_versions',
  {
    id: idColumn(),
    artifactId: uuid('artifact_id')
      .notNull()
      .references(() => artifacts.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    storageKey: text('storage_key').notNull(),
    mimeType: varchar('mime_type', { length: 128 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull().default(0),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('artifact_versions_artifact_idx').on(table.artifactId, table.version)],
);

export type ArtifactVersion = typeof artifactVersions.$inferSelect;
export type NewArtifactVersion = typeof artifactVersions.$inferInsert;
