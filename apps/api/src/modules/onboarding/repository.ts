import { and, desc, eq, ne } from 'drizzle-orm';

import { projectOnboarding, type Db } from '@nexus/db';

export type NewOnboardingRow = typeof projectOnboarding.$inferInsert;

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

  /** The most recent onboarding row for a project, regardless of user. */
  async getByProjectId(projectId: string) {
    const rows = await db
      .select()
      .from(projectOnboarding)
      .where(eq(projectOnboarding.projectId, projectId))
      .orderBy(desc(projectOnboarding.createdAt))
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
