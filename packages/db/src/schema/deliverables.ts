import { boolean, index, pgEnum, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

import { idColumn, timestamps } from './columns';
import { projects } from './projects';
import { users } from './users';

export const deliverableKind = pgEnum('deliverable_kind', [
  'word_report',
  'spreadsheet',
  'presentation',
  'timeline',
  'meeting_notes',
  'research_summary',
  'financial_model',
  'custom',
]);

/**
 * Project-scoped deliverables selected during onboarding (and later on the
 * project page). Presets carry their `kind`; user-typed ones are `custom`.
 */
export const deliverables = pgTable(
  'deliverables',
  {
    id: idColumn(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    kind: deliverableKind('kind').notNull(),
    isCustom: boolean('is_custom').notNull().default(false),
    isSystem: boolean('is_system').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [index('deliverables_project_idx').on(table.projectId)],
);

export type Deliverable = typeof deliverables.$inferSelect;
export type NewDeliverable = typeof deliverables.$inferInsert;
