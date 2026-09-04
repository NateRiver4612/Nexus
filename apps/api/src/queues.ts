import { Queue } from 'bullmq';

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

export const KNOWLEDGE_QUEUE = 'knowledge-process';

export function getKnowledgeQueue() {
  return getQueue<KnowledgeProcessJob>(KNOWLEDGE_QUEUE);
}
