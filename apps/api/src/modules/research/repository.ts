import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { aiRuns, projectResearch, type Db, type ProjectResearch } from '@nexus/db';

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

  async getNewByProjectId(projectId: string): Promise<ProjectResearch | undefined> {
    const rows = await db
      .select()
      .from(projectResearch)
      .where(and(eq(projectResearch.projectId, projectId), eq(projectResearch.status, 'completed')))
      .orderBy(desc(projectResearch.createdAt))
      .limit(1);
    return rows[0];
  },

  /** The queued/processing research run for a project, if any. */
  async getActiveRunByProjectId(projectId: string): Promise<{ id: string } | undefined> {
    const rows = await db
      .select({ id: aiRuns.id })
      .from(aiRuns)
      .where(
        and(
          eq(aiRuns.projectId, projectId),
          eq(aiRuns.aiTask, 'research'),
          inArray(aiRuns.status, ['queued', 'processing']),
        ),
      )
      .orderBy(desc(aiRuns.createdAt))
      .limit(1);
    return rows[0];
  },

  /** All completed research for a project, oldest first (version order). */
  async listCompletedByProjectId(projectId: string): Promise<ProjectResearch[]> {
    return db
      .select()
      .from(projectResearch)
      .where(and(eq(projectResearch.projectId, projectId), eq(projectResearch.status, 'completed')))
      .orderBy(asc(projectResearch.createdAt));
  },

  async create(input: {
    projectId: string;
    aiRunId: string;
    provider: string;
    model: string;
    brief: string;
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
