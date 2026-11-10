import { UnrecoverableError, Worker } from 'bullmq';

import { getRedis } from '../../redis';
import { env } from '../../env';
import { AI_QUEUE, AI_QUEUE_KICKOFF, type AIKickoffJob } from './queues';
import { aiRuns, getDb, projectOnboarding, type AiRunStageResult } from '@nexus/db';
import type { RunStageType } from '@nexus/types';
import { kickoffMilestonesSchema, kickoffSummarySchema } from '@nexus/zod-schemas';
import type { CompletionUsage } from 'openai/resources/completions.mjs';
import { buildKnowledgeContext } from '../kickoff/context';
import { generateKickoffPlan, type KickoffCheckpoint } from '../kickoff/generate';
import { mergeUsage } from '../kickoff/generate/toolCall';
import { KickoffStageRepository, type KickoffStageKey } from '../kickoff/repository';
import { runResearch } from '../research/stage';
import { tavilyProvider } from './providers/tavily';
import { eq, sql } from 'drizzle-orm';
import { onComplete } from '../../startWorkers';

/**
 * Rebuilds the kickoff checkpoint from persisted stage rows. jsonb can't enforce a shape,
 * so validate on the way out (same rule as `project_research`): an unreadable row is
 * treated as absent and the stage is simply regenerated.
 */
function readCheckpoint(rows: AiRunStageResult[]): KickoffCheckpoint {
  const milestonesRow = rows.find((row) => row.stage === 'drafting_milestones');
  const summaryRow = rows.find((row) => row.stage === 'drafting_summary');

  const milestones = milestonesRow
    ? kickoffMilestonesSchema.safeParse({ milestones: milestonesRow.data })
    : null;
  const summary = summaryRow ? kickoffSummarySchema.safeParse(summaryRow.data) : null;

  return {
    milestones: milestones?.success ? milestones.data.milestones : undefined,
    summary: summary?.success ? summary.data : undefined,
    // Every persisted stage's tokens were paid for, even one whose saved shape no
    // longer validates and gets regenerated — so count them all.
    usage: mergeUsage(
      ...rows.map((row): CompletionUsage => ({
        prompt_tokens: row.inputTokens,
        completion_tokens: row.outputTokens,
        total_tokens: row.inputTokens + row.outputTokens,
      })),
    ),
  };
}

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

          const kickoffStageRepository = KickoffStageRepository(db);

          const [knowledgeChunks, research, stageRows] = await Promise.all([
            buildKnowledgeContext({ db, projectId, stepData }),
            runResearch({
              db,
              provider: tavilyProvider,
              projectId,
              runId,
              stepData,
              today,
              model: 'pro',
            }),
            kickoffStageRepository.listByRunId(runId),
          ]);

          const checkpoint = readCheckpoint(stageRows);

          const checkpointStage = (
            stage: KickoffStageKey,
            data: unknown,
            usage?: CompletionUsage,
          ) =>
            kickoffStageRepository
              .saveStage({
                aiRunId: runId,
                stage,
                data,
                inputTokens: usage?.prompt_tokens ?? 0,
                outputTokens: usage?.completion_tokens ?? 0,
              })
              // Best-effort: this stage already succeeded and cost tokens. If saving it
              // fails, log and continue — a missing checkpoint only costs a regeneration
              // on retry, never the whole run.
              .catch((error) => {
                console.warn(`[worker] could not checkpoint ${stage} for run ${runId}:`, error);
              });

          const plan = await generateKickoffPlan(
            {
              stepData,
              knowledgeChunks,
              research: research.result?.digest ?? null,
            },
            {
              onStage: (stage) => setStage(runId, stage),
              checkpoint,
              onMilestones: (milestones, usage) =>
                checkpointStage('drafting_milestones', milestones, usage),
              onSummary: (summary, usage) => checkpointStage('drafting_summary', summary, usage),
            },
          );

          const usage = mergeUsage(research.usage, plan.usage);

          // Clearing the stage rows in the same transaction means a failed final write
          // rolls both back, keeping the checkpoint available for the queue's retry.
          await db.transaction(async (tx) => {
            await tx
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

            await KickoffStageRepository(tx).deleteByRunId(runId);
          });

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
    const finalAttempt = job.attemptsMade >= maxAttempts || err instanceof UnrecoverableError;

    // `startedAt` is set on the run's first attempt (coalesce), so this is a
    // wall-clock ceiling across all retries, independent of attempt count.
    const [run] = await db
      .select({ startedAt: aiRuns.startedAt })
      .from(aiRuns)
      .where(eq(aiRuns.id, runId))
      .limit(1);

    const startedAt = run?.startedAt;
    const timedOut = startedAt != null && Date.now() - startedAt.getTime() >= env.AI_RUN_TIMEOUT_MS;

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
