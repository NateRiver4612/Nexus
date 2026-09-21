import { asc, eq, and, ne, sql } from 'drizzle-orm';

import {
  artifacts,
  deliverables,
  knowledgeSources,
  milestones,
  projectMembers,
  projectOnboarding,
  projectProgress,
  projects,
  tasks,
  workspaceMembers,
  workspaces,
  type Db,
} from '@nexus/db';
import type { TaskType } from '@nexus/types';

export type NewProjectRow = typeof projects.$inferInsert;
export type NewOnboardingRow = typeof projectOnboarding.$inferInsert;

/** Project fields + live aggregates, shared by the list and detail queries. */
const projectDetailsFields = {
  id: projects.id,
  workspaceId: projects.workspaceId,
  name: projects.name,
  slug: projects.slug,
  description: projects.description,
  status: projects.status,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,

  // progress
  lastOpenedAt: projectProgress.lastOpenedAt,

  // full current task as a nested object, not flattened columns
  currentTask: sql<TaskType | null>`(
    select to_jsonb(${tasks}) from ${tasks} where ${tasks.id} = ${projectProgress.currentTaskId}
  )`,

  // counts — correlated subqueries too, but scalar instead of row
  numOfTasks: sql<number>`(select count(*)::int from ${tasks} where ${tasks.projectId} = ${projects.id})`,
  numOfCompletedTasks: sql<number>`(select count(*)::int from ${tasks} where ${tasks.projectId} = ${projects.id} and ${tasks.status} = 'completed')`,
  numOfMilestones: sql<number>`(select count(*)::int from ${milestones} where ${milestones.projectId} = ${projects.id})`,
  numOfArtifacts: sql<number>`(select count(*)::int from ${artifacts} where ${artifacts.projectId} = ${projects.id})`,
  numOfDeliverables: sql<number>`(select count(*)::int from ${deliverables} where ${deliverables.projectId} = ${projects.id})`,
  numOfKnowledgeSources: sql<number>`(select count(*)::int from ${knowledgeSources} where ${knowledgeSources.projectId} = ${projects.id})`,
};

export const ProjectsRepository = (db: Db) => ({
  create(values: NewProjectRow) {
    return db.insert(projects).values(values).returning();
  },

  async getById(id: string) {
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.status, 'active')))
      .limit(1);
    return rows[0];
  },

  async getByIdRaw(id: string) {
    const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return rows[0];
  },

  /** Active project + live aggregates (progress, current task, counts). */
  async getByIdWithDetails(id: string) {
    const rows = await db
      .select(projectDetailsFields)
      .from(projects)
      .leftJoin(projectProgress, eq(projectProgress.projectId, projects.id))
      .where(and(eq(projects.id, id), eq(projects.status, 'active')))
      .limit(1);
    return rows[0];
  },

  listByWorkspace(workspaceId: string) {
    return db
      .select(projectDetailsFields)
      .from(projects)
      .leftJoin(projectProgress, eq(projectProgress.projectId, projects.id))
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.status, 'active')))
      .orderBy(asc(projects.createdAt));
  },

  update(id: string, patch: Partial<NewProjectRow>) {
    return db.update(projects).set(patch).where(eq(projects.id, id)).returning();
  },

  remove(id: string) {
    return db.delete(projects).where(eq(projects.id, id)).returning();
  },

  async findWorkspaceForUser(userId: string) {
    const rows = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId))
      .limit(1);
    return rows[0];
  },

  createWorkspace(values: typeof workspaces.$inferInsert) {
    return db.insert(workspaces).values(values).returning();
  },

  addWorkspaceMember(values: typeof workspaceMembers.$inferInsert) {
    return db.insert(workspaceMembers).values(values);
  },

  addProjectMember(values: typeof projectMembers.$inferInsert) {
    return db.insert(projectMembers).values(values);
  },
});

/** Resolved row shape of the projects-with-details queries (list + detail). */
export type ProjectDetailsRow = Awaited<
  ReturnType<ReturnType<typeof ProjectsRepository>['listByWorkspace']>
>[number];

export const OnboardingRepository = (db: Db) => ({
  async getByUserId(userId: string) {
    const rows = await db
      .select()
      .from(projectOnboarding)
      .where(and(eq(projectOnboarding.userId, userId), ne(projectOnboarding.status, 'completed')))
      .limit(1);
    return rows[0];
  },

  async getById(id: string) {
    const rows = await db
      .select()
      .from(projectOnboarding)
      .where(eq(projectOnboarding.id, id))
      .limit(1);
    return rows[0];
  },

  async create(values: NewOnboardingRow) {
    return (await db.insert(projectOnboarding).values(values).returning())[0];
  },

  async update(id: string, patch: Partial<NewOnboardingRow>) {
    return (
      await db.update(projectOnboarding).set(patch).where(eq(projectOnboarding.id, id)).returning()
    )[0];
  },
});
