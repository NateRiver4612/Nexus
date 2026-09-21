import { Worker } from 'bullmq';

import { getRedis } from '../../redis';
import { onComplete } from '../../startWorkers';
import { AI_QUEUE, AI_QUEUE_KICKOFF, type AIKickoffJob } from './queues';
import { aiRuns, getDb } from '@nexus/db';
import { buildKnowledgeContext } from '../kickoff/context';
import { generateKickoffPlan } from '../kickoff/generate';
import { eq } from 'drizzle-orm';

const AIWorker = () => {
  const db = getDb();

  const worker = new Worker<AIKickoffJob>(
    AI_QUEUE,
    async (job) => {
      switch (job.name) {
        case AI_QUEUE_KICKOFF:
          console.log(`[worker] ${AI_QUEUE_KICKOFF} ${job.id} processing.`);
          const { jobId: runId, projectId, data: stepData } = job.data as AIKickoffJob;

          await db
            .update(aiRuns)
            .set({
              status: 'processing',
            })
            .where(eq(aiRuns.id, runId));

          const knowledgeChunks = await buildKnowledgeContext({ db, projectId, stepData });

          const plan = await generateKickoffPlan({ stepData, knowledgeChunks });

          await db
            .update(aiRuns)
            .set({
              status: 'completed',
              completedAt: new Date(),
              updatedAt: new Date(),
              inputTokens: plan.usage?.prompt_tokens,
              data: plan.data,
              outputTokens: plan.usage?.completion_tokens,
            })
            .where(eq(aiRuns.id, runId));
          return plan;
        default:
          throw new Error(`Unknonw job type: ${job.name}`);
      }
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

    const runId = job.data.jobId;

    const db = getDb();
    await db
      .update(aiRuns)
      .set({ status: 'failed', errorMessage: String(err) })
      .where(eq(aiRuns.id, runId));
  });

  return worker;
};

export default AIWorker;
