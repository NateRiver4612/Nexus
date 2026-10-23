import { Worker } from 'bullmq';
import { eq, sql } from 'drizzle-orm';

import { aiRuns, getDb } from '@nexus/db';

import { getRedis } from '../../redis';
import { createTavilyProvider } from '../ai/providers/tavily';
import { runResearch } from './stage';
import { ResearchRepository } from './repository';
import { RESEARCH_QUEUE, type AIResearchJob } from './queues';
import { onComplete } from '../../startWorkers';

const ResearchWorker = () => {
  const db = getDb();

  const worker = new Worker<AIResearchJob>(
    RESEARCH_QUEUE,
    async (job) => {
      console.log(`[worker] research ${job.id} processing.`);

      const { jobId: runId, projectId, data: stepData, reason, sourceLimit } = job.data;

      await db
        .update(aiRuns)
        .set({
          status: 'processing',
          stage: 'researching',
          stageUpdatedAt: new Date(),
          startedAt: sql`coalesce(${aiRuns.startedAt}, now())`,
          updatedAt: new Date(),
        })
        .where(eq(aiRuns.id, runId));

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const research = await runResearch({
        db,
        provider: createTavilyProvider(),
        projectId,
        runId,
        stepData,
        today,
        reason,
        model: 'mini',
        outputLength: 'short',
        sourceLimit,
      });

      const researchRepository = ResearchRepository(db);

      if (!research.result) {
        const row = await researchRepository.getByAiRunId(runId);
        await db
          .update(aiRuns)
          .set({
            status: 'failed',
            errorMessage: row?.errorMessage ?? 'Research failed',
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(aiRuns.id, runId));
        return research;
      }

      await db
        .update(aiRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
          inputTokens: research.usage?.prompt_tokens ?? 0,
          outputTokens: research.usage?.completion_tokens ?? 0,
        })
        .where(eq(aiRuns.id, runId));

      return research;
    },
    {
      connection: getRedis(),
      concurrency: 3,
      lockDuration: 5 * 60 * 1000,
    },
  );

  worker.on('completed', onComplete);

  worker.on('failed', async (job, err) => {
    if (!job) return;

    const db = getDb();
    const runId = job.data.jobId;

    const maxAttempts = job.opts.attempts ?? 1;
    const finalAttempt = job.attemptsMade >= maxAttempts;

    if (finalAttempt) {
      await db
        .update(aiRuns)
        .set({
          status: 'failed',
          errorMessage: String(err),
          updatedAt: new Date(),
        })
        .where(eq(aiRuns.id, runId));
    }
  });

  return worker;
};

export default ResearchWorker;
