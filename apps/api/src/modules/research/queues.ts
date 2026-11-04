import { type JobsOptions } from 'bullmq';
import { getQueue } from '../../lib/getQueue';
import type { OnboardingDataType } from '@nexus/types';

export const RESEARCH_QUEUE = 'research';
export const RESEARCH_JOB = 'research';

export type AIResearchJob = {
  jobId: string;
  projectId: string;
  data: OnboardingDataType;
  /** Optional user reason for (re)generation, fed into the research prompt. */
  reason?: string;
  /** Max sources to keep (1–20). Defaults to the stage's max. */
  sourceLimit?: number;
};

export function getResearchQueue() {
  return getQueue<AIResearchJob>(RESEARCH_QUEUE);
}

/** Enqueue a research run keyed on the aiRun id so re-submits don't double-process. */
export async function enqueueResearch({
  jobId,
  projectId,
  data,
  reason,
  sourceLimit,
  options,
}: AIResearchJob & { options?: JobsOptions }) {
  const queue = getResearchQueue();

  // Allow re-processing a previously failed/ready run: drop any prior job first.
  await queue.remove(jobId);
  await queue.add(
    RESEARCH_JOB,
    {
      projectId,
      data,
      jobId,
      ...(reason ? { reason } : {}),
      ...(sourceLimit ? { sourceLimit } : {}),
    },
    {
      removeOnComplete: true,
      removeOnFail: {
        count: 5000,
      },
      // Crash-safety only. Provider failures are retried inside runResearch, not by BullMQ:
      // a queue retry would replay the whole kickoff job (plan + LLM calls) just to retry
      // research. This retry only covers the worker dying mid-run; the row's resume logic
      // picks up where it left off.
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...options,
      jobId,
    },
  );
}
