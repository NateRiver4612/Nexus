import { eq } from 'drizzle-orm';

import { aiRunStages, type AiRunStage, type AiRunStageResult, type Db } from '@nexus/db';

/** Only the kickoff stages that are worth checkpointing across a queue retry. */
export type KickoffStageKey = Extract<
  AiRunStage,
  'drafting_milestones' | 'drafting_summary'
>;

/**
 * Persistence for kickoff's per-stage results (`ai_run_stages`). Keyed by `aiRunId` + `stage`
 * so a BullMQ retry of the same run resumes a completed stage instead of paying for the same
 * LLM call again. Research is deliberately absent: `project_research` already owns its own
 * resume state and user-facing record.
 */
export const KickoffStageRepository = (db: Db) => ({
  async listByRunId(aiRunId: string): Promise<AiRunStageResult[]> {
    return db.select().from(aiRunStages).where(eq(aiRunStages.aiRunId, aiRunId));
  },

  /** Upserts so a stage that had to be regenerated overwrites its stale result. */
  async saveStage({
    aiRunId,
    stage,
    data,
    inputTokens = 0,
    outputTokens = 0,
  }: {
    aiRunId: string;
    stage: KickoffStageKey;
    data: unknown;
    inputTokens?: number;
    outputTokens?: number;
  }): Promise<AiRunStageResult | undefined> {
    const rows = await db
      .insert(aiRunStages)
      .values({ aiRunId, stage, data, inputTokens, outputTokens })
      .onConflictDoUpdate({
        target: [aiRunStages.aiRunId, aiRunStages.stage],
        set: { data, inputTokens, outputTokens, updatedAt: new Date() },
      })
      .returning();

    return rows[0];
  },

  async deleteByRunId(aiRunId: string): Promise<void> {
    await db.delete(aiRunStages).where(eq(aiRunStages.aiRunId, aiRunId));
  },
});
