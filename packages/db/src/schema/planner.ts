import {
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

export const taskStatus = pgEnum('task_status', ['todo', 'in_progress', 'completed', 'cancelled']);
export const milestoneStatus = pgEnum('milestone_status', [
  'planned',
  'active',
  'paused',
  'completed',
]);
export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);

export const milestones = pgTable(
  'milestones',
  {
    id: idColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    position: integer('position').notNull().default(0),
    status: milestoneStatus('status').notNull().default('planned'),
    dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [index('milestones_project_idx').on(table.projectId, table.position)],
);

export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;

export const tasks = pgTable(
  'tasks',
  {
    id: idColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    milestoneId: uuid('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: taskStatus('status').notNull().default('todo'),
    priority: taskPriority('priority').notNull().default('medium'),
    position: integer('position').notNull().default(0),
    dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    index('tasks_project_idx').on(table.projectId),
    index('tasks_milestone_idx').on(table.milestoneId),
    index('tasks_status_idx').on(table.status),
    index('tasks_due_date_idx').on(table.dueDate),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

/**
 * "Resume working" — points back at where the user left off inside a project.
 */
export const projectProgress = pgTable('project_progress', {
  id: idColumn(),
  projectId: uuid('project_id')
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: 'cascade' }),
  currentTaskId: uuid('current_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectProgress = typeof projectProgress.$inferSelect;
