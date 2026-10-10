import {
  index,
  integer,
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
import type { AITaskResultMap } from '@nexus/types';

export const suggestionStatus = pgEnum('suggestion_status', [
  'pending',
  'accepted',
  'dismissed',
  'expired',
]);

export const runStatus = pgEnum('ai_run_status', ['queued', 'processing', 'completed', 'failed']);

export const aiTask = pgEnum('ai_task', [
  'rewrite',
  'summarize',
  'classify',
  'project-chat',
  'kickoff',
  'research',
  'artifact-generation',
  'project-health',
]);

/**
 * AI creates suggestions, not mutations — the user decides whether they happen.
 */
export const aiSuggestions = pgTable(
  'ai_suggestions',
  {
    id: idColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 48 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: suggestionStatus('status').notNull().default('pending'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('ai_suggestions_project_idx').on(table.projectId, table.status)],
);

export type AiSuggestion = typeof aiSuggestions.$inferSelect;
export type NewAiSuggestion = typeof aiSuggestions.$inferInsert;

/**
 * Tracks AI operations for debugging, usage and cost.
 */
export const aiRuns = pgTable(
  'ai_runs',
  {
    id: idColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: runStatus('status').notNull().default('queued'),
    aiTask: aiTask('ai_task').notNull(),
    errorMessage: text('error_message'),
    data: jsonb('data').$type<AITaskResultMap[keyof AITaskResultMap]>(),
    model: varchar('model', { length: 128 }),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('ai_runs_project_idx').on(table.projectId, table.createdAt)],
);

export type AiRun = typeof aiRuns.$inferSelect;
export type NewAiRun = typeof aiRuns.$inferInsert;
export type AiTask = typeof aiTask.enumValues;
