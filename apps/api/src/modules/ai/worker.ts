import { Worker } from 'bullmq';

import { getRedis } from '../../redis';
import { AI_QUEUE, AI_QUEUE_KICKOFF, type AIKickoffJob } from './queues';
import { aiRuns, getDb, projectOnboarding } from '@nexus/db';
import type { RunStageType } from '@nexus/types';
import { buildKnowledgeContext } from '../kickoff/context';
import { generateKickoffPlan } from '../kickoff/generate';
import { mergeUsage } from '../kickoff/generate/toolCall';
import { runResearchStage } from '../kickoff/research';
import { createTavilyProvider } from './providers/tavily';
import { eq, sql } from 'drizzle-orm';
import { onComplete } from '../../startWorkers';

const AIWorker = () => {
  const db = getDb();

  const setStage = (runId: string, stage: RunStageType) =>
    db
      .update(aiRuns)
      .set({ stage, stageUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(aiRuns.id, runId));

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
              stage: 'researching',
              stageUpdatedAt: new Date(),
              startedAt: sql`coalesce(${aiRuns.startedAt}, now())`,
              updatedAt: new Date(),
            })
            .where(eq(aiRuns.id, runId));

          const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

          const [knowledgeChunks, research] = await Promise.all([
            buildKnowledgeContext({ db, projectId, stepData }),
            runResearchStage({
              db,
              provider: createTavilyProvider(),
              projectId,
              runId,
              stepData,
              today,
            }),
          ]);

          const plan = await generateKickoffPlan(
            {
              stepData,
              knowledgeChunks,
              research: research.result?.digest ?? null,
            },
            {
              onStage: (stage) => setStage(runId, stage),
            },
          );

          const usage = mergeUsage(research.usage, plan.usage);

          await db
            .update(aiRuns)
            .set({
              status: 'completed',
              completedAt: new Date(),
              updatedAt: new Date(),
              inputTokens: usage?.prompt_tokens,
              data: plan.data,
              outputTokens: usage?.completion_tokens,
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

  worker.on('completed', async (job) => {
    const db = getDb();

    const aiRun = job.data.jobId;
    const onboardingId = job.data.onboardingId;

    await db
      .update(projectOnboarding)
      .set({
        aiRun,
        status: 'submitted',
        updatedAt: new Date(),
      })
      .where(eq(projectOnboarding.id, onboardingId));

    onComplete(job);
  });
  worker.on('failed', async (job, err) => {
    if (!job) return;

    const db = getDb();

    const runId = job.data.jobId;

    const finalAttempt = job.attemptsMade + 1 === job.opts.attempts;

    await db
      .update(aiRuns)
      .set(
        finalAttempt
          ? { status: 'failed', errorMessage: String(err), updatedAt: new Date() }
          : { stage: 'retrying', stageUpdatedAt: new Date(), updatedAt: new Date() },
      )
      .where(eq(aiRuns.id, runId));
  });

  return worker;
};

export default AIWorker;
