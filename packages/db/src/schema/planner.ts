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
export const milestoneStatus = pgEnum('milestone_status', ['planned', 'active', 'completed']);
export const taskDifficulty = pgEnum('task_difficulty', ['low', 'medium', 'high']);

export type TaskStatus = (typeof taskStatus.enumValues)[number];
export type MilestoneStatus = (typeof milestoneStatus.enumValues)[number];
export type TaskDifficulty = (typeof taskDifficulty.enumValues)[number];

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
    difficulty: taskDifficulty('difficulty').notNull().default('medium'),
    estimatedTimeMinutes: integer('estimated_time_minutes'),
    actualTimeMinutes: integer('actual_time_minutes'), // @todo: Later when support the task Timer (https://trello.com/c/lUBU0lO0/53-add-timer-for-task)
    instructions: text('instructions').array().notNull().default([]),
    position: integer('position').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    index('tasks_project_idx').on(table.projectId),
    index('tasks_milestone_idx').on(table.milestoneId),
    index('tasks_status_idx').on(table.status),
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
  progressPercentage: integer('progress_percentage').notNull().default(0),
  currentTaskId: uuid('current_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
});

export type ProjectProgress = typeof projectProgress.$inferSelect;
