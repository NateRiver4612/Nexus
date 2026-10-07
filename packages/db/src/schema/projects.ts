import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { idColumn, timestamps } from './columns';
import { users } from './users';
import { workspaces } from './workspaces';
import { tasks } from './planner';
import { type OnboardingDataType } from '@nexus/types';
import { aiRuns } from './ai';

export const projectStatus = pgEnum('project_status', [
  'draft',
  'active',
  'paused',
  'archived',
  'completed',
]);

export const projectCategory = pgEnum('project_category', [
  'marketing',
  'finance',
  'research',
  'engineering',
  'personal',
]);

export const projectOnboardingStatus = pgEnum('project_onboarding_status', [
  'in_progress',
  'submitted',
  'completed',
]);

export const projectRole = pgEnum('project_role', ['owner', 'manager', 'member', 'viewer']);

export const projects = pgTable(
  'projects',
  {
    id: idColumn(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    description: text('description'),
    readme: text('readme'),
    category: projectCategory('project_category').notNull(),
    // validation happens at the read boundary (kickoffSummarySchema.safeParse),
    // same as everywhere else AI output becomes application state.
    summary: jsonb('summary').$type<Record<string, unknown> | null>(),
    status: projectStatus('status').notNull().default('draft'),
    startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }),
    targetDate: timestamp('target_date', { withTimezone: true, mode: 'date' }),
    createdBy: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('projects_workspace_idx').on(table.workspaceId),
    index('projects_status_idx').on(table.status),
    uniqueIndex('projects_workspace_slug_idx').on(table.workspaceId, table.slug),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export const projectMembers = pgTable(
  'project_members',
  {
    id: idColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: projectRole('role').notNull().default('member'),
    ...timestamps,
  },
  (table) => [uniqueIndex('project_members_unique_idx').on(table.projectId, table.userId)],
);

export const projectOnboarding = pgTable(
  'project_onboarding',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    workspaceId: uuid('workspace_id')
      .references(() => workspaces.id, { onDelete: 'cascade' })
      .notNull(),
    status: projectOnboardingStatus('onboarding_status').notNull().default('in_progress'),
    step: integer('step').notNull().default(1),
    aiRun: uuid('ai_run').references(() => aiRuns.id, {
      onDelete: 'set null',
    }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    stepData: jsonb('step_data').$type<OnboardingDataType | {}>().notNull().default({}),
    ...timestamps,
  },
  (table) => [uniqueIndex('project_onboarding_unique_idx').on(table.userId, table.projectId)],
);

export type ProjectMember = typeof projectMembers.$inferSelect;

/**
 * "Resume working" — points back at where the user left off inside a project.
 * Lives here (not planner) because it's the project-level progress record; the
 * current-task FK defers onto `tasks` via a lazy thunk to avoid eager evaluation
 * of the planner ⇄ projects circular import.
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
