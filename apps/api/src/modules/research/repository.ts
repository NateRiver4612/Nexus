import { desc, eq } from 'drizzle-orm';

import { projectResearch, type Db, type ProjectResearch } from '@nexus/db';

/**
 * Persistence for a kickoff research run (`project_research`). Keyed by `aiRunId` so a
 * BullMQ retry of the same run resumes the existing row instead of paying for a new
 * provider request.
 */
export const ResearchRepository = (db: Db) => ({
  async getByAiRunId(aiRunId: string): Promise<ProjectResearch | undefined> {
    const rows = await db
      .select()
      .from(projectResearch)
      .where(eq(projectResearch.aiRunId, aiRunId))
      .limit(1);
    return rows[0];
  },

  async getLatestByProjectId(projectId: string): Promise<ProjectResearch | undefined> {
    const rows = await db
      .select()
      .from(projectResearch)
      .where(eq(projectResearch.projectId, projectId))
      .orderBy(desc(projectResearch.createdAt))
      .limit(1);
    return rows[0];
  },

  async create(input: {
    projectId: string;
    aiRunId: string;
    provider: string;
    model: string;
    prompt: string;
  }): Promise<ProjectResearch | undefined> {
    const rows = await db
      .insert(projectResearch)
      .values({ ...input, status: 'pending' })
      .returning();
    return rows[0];
  },

  async markSubmitted({
    id,
    requestId,
    startedAt,
  }: {
    id: string;
    requestId: string;
    startedAt: Date;
  }): Promise<ProjectResearch | undefined> {
    const rows = await db
      .update(projectResearch)
      .set({ requestId, status: 'in_progress', startedAt, updatedAt: new Date() })
      .where(eq(projectResearch.id, id))
      .returning();
    return rows[0];
  },

  async markCompleted({
    id,
    content,
    sources,
    creditsUsed,
    responseTime,
  }: {
    id: string;
    content: ProjectResearch['content'];
    sources: ProjectResearch['sources'];
    creditsUsed: ProjectResearch['creditsUsed'];
    responseTime: ProjectResearch['responseTime'];
  }): Promise<ProjectResearch | undefined> {
    const rows = await db
      .update(projectResearch)
      .set({
        status: 'completed',
        content,
        sources,
        creditsUsed,
        responseTime,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projectResearch.id, id))
      .returning();
    return rows[0];
  },

  async markFailed({
    id,
    errorMessage,
  }: {
    id: string;
    errorMessage: string;
  }): Promise<ProjectResearch | undefined> {
    const rows = await db
      .update(projectResearch)
      .set({
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projectResearch.id, id))
      .returning();
    return rows[0];
  },
});
