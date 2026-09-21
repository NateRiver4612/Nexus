import { type JobsOptions } from 'bullmq';
import { getQueue } from '../../lib/getQueue';
import type { OnboardingDataType } from '@nexus/types';

export const AI_QUEUE = 'ai-generation';
export const AI_QUEUE_ARTIFACT_GENERATION = 'artifact-generation';
export const AI_QUEUE_KICKOFF = 'kickoff';

export type AIKickoffJob = {
  jobId: string;
  projectId: string;
  data: OnboardingDataType;
};

export type AIJob = AIKickoffJob; // | AiArtifactGenerationJob | ...;

export function getAiQueue() {
  return getQueue<AIJob>(AI_QUEUE);
}

/** Enqueue the ingestion job keyed on the source so re-submits don't double-process. */
export async function enqueueAI({
  name,
  jobId,
  projectId,
  data,
  options,
}: AIKickoffJob & {
  name: string;
  options?: JobsOptions;
}) {
  const queue = getAiQueue();

  // Allow re-processing a previously failed/ready source: drop any prior run first.
  await queue.remove(jobId);
  await queue.add(
    name,
    {
      projectId,
      data,
      jobId,
    },
    {
      removeOnComplete: true,
      removeOnFail: {
        count: 5000,
      },
      attempts: 1,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...options,
      jobId,
    },
  );
}
