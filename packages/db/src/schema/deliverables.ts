import {
  boolean,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

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

export const deliverablesProjectsAssignment = pgTable(
  'deliverables_projects_assignment',
  {
    id: idColumn(),
    deliverableId: uuid('deliverable_id')
      .notNull()
      .references(() => deliverables.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('deliverables_projects_assignment_unique_idx').on(
      table.deliverableId,
      table.projectId,
    ),
    index('deliverables_projects_assignment_project_idx').on(table.projectId),
  ],
);

export type DeliverablesProjectAssignment = typeof deliverablesProjectsAssignment.$inferSelect;
export type NewDeliverablesProjectAssignment = typeof deliverablesProjectsAssignment.$inferInsert;
