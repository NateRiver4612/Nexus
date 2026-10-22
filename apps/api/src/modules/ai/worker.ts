import { Worker } from 'bullmq';

import { getRedis } from '../../redis';
import { env } from '../../env';
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

    // BullMQ increments `attemptsMade` before emitting this event, so the final
    // attempt has `attemptsMade === attempts` (the old `+ 1` overshot and left the
    // run stuck on `retrying` after the last failure).
    const maxAttempts = job.opts.attempts ?? 1;
    const finalAttempt = job.attemptsMade >= maxAttempts;

    // `startedAt` is set on the run's first attempt (coalesce), so this is a
    // wall-clock ceiling across all retries, independent of attempt count.
    const [run] = await db
      .select({ startedAt: aiRuns.startedAt })
      .from(aiRuns)
      .where(eq(aiRuns.id, runId))
      .limit(1);

    const startedAt = run?.startedAt;
    const timedOut =
      startedAt != null && Date.now() - startedAt.getTime() >= env.AI_RUN_TIMEOUT_MS;

    await db
      .update(aiRuns)
      .set(
        finalAttempt || timedOut
          ? {
              status: 'failed',
              errorMessage: timedOut
                ? `Run timed out after ${Math.round(env.AI_RUN_TIMEOUT_MS / 60_000)} minutes.`
                : String(err),
              updatedAt: new Date(),
            }
          : { stage: 'retrying', stageUpdatedAt: new Date(), updatedAt: new Date() },
      )
      .where(eq(aiRuns.id, runId));
  });

  return worker;
};

export default AIWorker;
