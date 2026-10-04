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

export const taskStatus = pgEnum('task_status', ['todo', 'in_progress', 'completed', 'cancelled']);
export const milestoneStatus = pgEnum('milestone_status', ['planned', 'active', 'completed']);
export const taskDifficulty = pgEnum('task_difficulty', ['low', 'medium', 'high']);
export const taskStepStatus = pgEnum('task_step_status', ['todo', 'completed']);

export type TaskStatus = (typeof taskStatus.enumValues)[number];
export type MilestoneStatus = (typeof milestoneStatus.enumValues)[number];
export type TaskDifficulty = (typeof taskDifficulty.enumValues)[number];
export type TaskStepStatus = (typeof taskStepStatus.enumValues)[number];

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
 * A single instruction step of a task — replaces the old `tasks.instructions`
 * text[] column with per-step rows so each step can be tracked/completed
 * independently (status `todo` → `completed`).
 */
export const taskSteps = pgTable(
  'task_steps',
  {
    id: idColumn(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    position: integer('position').notNull().default(0),
    status: taskStepStatus('status').notNull().default('todo'),
    ...timestamps,
  },
  (table) => [index('task_steps_task_idx').on(table.taskId, table.position)],
);

export type TaskStep = typeof taskSteps.$inferSelect;
export type NewTaskStep = typeof taskSteps.$inferInsert;

/**
 * A task's "definition of done" item — how the user knows the task is actually
 * finished. Mirrors `taskSteps` (value, position, status) but gates completion:
 * a task may only be completed when every DoD item is `completed`.
 */
export const taskDods = pgTable(
  'task_dods',
  {
    id: idColumn(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    position: integer('position').notNull().default(0),
    status: taskStepStatus('status').notNull().default('todo'),
    ...timestamps,
  },
  (table) => [index('task_dods_task_idx').on(table.taskId, table.position)],
);

export type TaskDod = typeof taskDods.$inferSelect;
export type NewTaskDod = typeof taskDods.$inferInsert;

/**
 * A note attached to a task. `content` is the structured document (e.g. the
 * Tiptap JSON tree) the editor works with; `contentText` is its plain-text
 * render for search/listing/AI. Multiple notes per task, newest first.
 */
export const taskNotes = pgTable(
  'task_notes',
  {
    id: idColumn(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull().default('Untitled'),
    content: jsonb('content').$type<Record<string, unknown>>().notNull(),
    contentText: text('content_text'),
    ...timestamps,
  },
  (table) => [index('task_notes_task_idx').on(table.taskId, table.createdAt)],
);

export type TaskNote = typeof taskNotes.$inferSelect;
export type NewTaskNote = typeof taskNotes.$inferInsert;

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
