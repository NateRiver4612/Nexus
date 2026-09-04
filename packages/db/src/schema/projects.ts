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
import { type OnboardingDataType } from '@nexus/types';

export const projectStatus = pgEnum('project_status', [
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
]);

export const projectOnboardingStatus = pgEnum('project_onboarding_status', [
  'draft',
  'in_progress',
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
    status: projectStatus('status').notNull().default('active'),
    startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }),
    targetDate: timestamp('target_date', { withTimezone: true, mode: 'date' }),
    createdBy: uuid('created_by')
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
    workspaceId: uuid('workspace_id')
      .references(() => workspaces.id, { onDelete: 'cascade' })
      .notNull(),
    status: projectOnboardingStatus('onboarding_status').notNull().default('draft'),
    name: varchar('name', { length: 255 }).notNull(),
    step: integer('step').notNull().default(1),
    stepData: jsonb('step_data').$type<OnboardingDataType | {}>().notNull().default({}),
    ...timestamps,
  },
  (table) => [uniqueIndex('project_onboarding_unique_idx').on(table.userId, table.name)],
);

export type ProjectMember = typeof projectMembers.$inferSelect;
