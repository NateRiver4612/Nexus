import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { idColumn, timestamps } from './columns';
import { projects } from './projects';
import { users } from './users';
import { workspaces } from './workspaces';

export const eventStatus = pgEnum('event_status', ['scheduled', 'cancelled', 'completed']);

/**
 * Calendar events are workspace-scoped and optionally project-scoped.
 * project_id = NULL means a global event (personal event, meeting, deadline).
 */
export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: idColumn(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    location: varchar('location', { length: 255 }),
    status: eventStatus('status').notNull().default('scheduled'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    index('calendar_events_workspace_idx').on(table.workspaceId),
    index('calendar_events_project_idx').on(table.projectId),
    index('calendar_events_start_at_idx').on(table.startAt),
  ],
);

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
