import { Queue, type JobsOptions } from 'bullmq';

import { getRedis } from './redis';

const globalForQueues = globalThis as unknown as { nexusQueues?: Map<string, Queue> };

export function getQueue<T>(name: string) {
  // Reuse queues across hot-reloading dev servers.
  if (!globalForQueues.nexusQueues) {
    globalForQueues.nexusQueues = new Map();
  }
  const existing = globalForQueues.nexusQueues.get(name);
  if (existing) {
    return existing as Queue<T>;
  }
  const queue = new Queue<T>(name, { connection: getRedis() });
  globalForQueues.nexusQueues.set(name, queue);
  return queue;
}

export type KnowledgeProcessJob = { sourceId: string };
export type KnowledgeRemoveJob = { storageKey: string };

export const KNOWLEDGE_QUEUE = 'knowledge';
export const KNOWLEDGE_QUEUE_PROCESS = 'knowledge-process';
export const KNOWLEDGE_QUEUE_REMOVE = 'knowledge-remove';

export function getKnowledgeQueue() {
  return getQueue<KnowledgeProcessJob | KnowledgeRemoveJob>(KNOWLEDGE_QUEUE);
}

/** Enqueue the ingestion job keyed on the source so re-submits don't double-process. */
export async function enqueueIngest({
  name,
  data,
  jobId,
  options,
}: {
  name: string;
  data: KnowledgeProcessJob | KnowledgeRemoveJob;
  jobId: string;
  options?: JobsOptions;
}) {
  const queue = getKnowledgeQueue();

  // Allow re-processing a previously failed/ready source: drop any prior run first.
  await queue.remove(jobId);
  await queue.add(name, data, {
    removeOnComplete: true,
    removeOnFail: {
      count: 5000,
    },
    ...options,
    jobId,
  });
}
