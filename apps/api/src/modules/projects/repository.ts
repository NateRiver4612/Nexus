import { asc, eq } from 'drizzle-orm';

import { getDb, projectMembers, projectOnboarding, projects, workspaceMembers, workspaces } from '@nexus/db';

export type NewProjectRow = typeof projects.$inferInsert;
export type NewOnboardingRow = typeof projectOnboarding.$inferInsert;

export const projectsRepository = {
  create(values: NewProjectRow) {
    return getDb().insert(projects).values(values).returning();
  },

  async getById(id: string) {
    const rows = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
    return rows[0];
  },

  listByWorkspace(workspaceId: string) {
    return getDb()
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(asc(projects.createdAt));
  },

  update(id: string, patch: Partial<NewProjectRow>) {
    return getDb().update(projects).set(patch).where(eq(projects.id, id)).returning();
  },

  remove(id: string) {
    return getDb().delete(projects).where(eq(projects.id, id)).returning();
  },

  async findWorkspaceForUser(userId: string) {
    const rows = await getDb()
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId))
      .limit(1);
    return rows[0];
  },

  createWorkspace(values: typeof workspaces.$inferInsert) {
    return getDb().insert(workspaces).values(values).returning();
  },

  addWorkspaceMember(values: typeof workspaceMembers.$inferInsert) {
    return getDb().insert(workspaceMembers).values(values);
  },

  addProjectMember(values: typeof projectMembers.$inferInsert) {
    return getDb().insert(projectMembers).values(values);
  },
};

export const onboardingRepository = {
  async getForUser(userId: string) {
    const rows = await getDb()
      .select()
      .from(projectOnboarding)
      .where(eq(projectOnboarding.userId, userId))
      .limit(1);
    return rows[0];
  },

  create(values: NewOnboardingRow) {
    return getDb().insert(projectOnboarding).values(values).returning();
  },

  update(id: string, patch: Partial<NewOnboardingRow>) {
    return getDb().update(projectOnboarding).set(patch).where(eq(projectOnboarding.id, id)).returning();
  },
};
