import { asc, eq, and } from 'drizzle-orm';

import {
  projectMembers,
  projectOnboarding,
  projects,
  workspaceMembers,
  workspaces,
  type Db,
} from '@nexus/db';

export type NewProjectRow = typeof projects.$inferInsert;
export type NewOnboardingRow = typeof projectOnboarding.$inferInsert;

export const ProjectsRepository = (db: Db) => ({
  create(values: NewProjectRow) {
    return db.insert(projects).values(values).returning();
  },

  async getById(id: string) {
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.status, 'completed')))
      .limit(1);
    return rows[0];
  },

  listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.status, 'completed')))
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

export const OnboardingRepository = (db: Db) => ({
  async getByUserId(userId: string) {
    const rows = await db
      .select()
      .from(projectOnboarding)
      .where(eq(projectOnboarding.userId, userId))
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
