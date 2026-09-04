import { Worker } from 'bullmq';

import { getRedis } from './redis';
import { KNOWLEDGE_QUEUE, type KnowledgeProcessJob } from './queues';
import { processSource } from './modules/knowledge/service';

const globalForWorkers = globalThis as unknown as { nexusWorkers?: Worker[] };

type PingJob = { message?: string };

export function startWorkers() {
  // Avoid spawning duplicate workers across hot-reloading dev servers.
  if (globalForWorkers.nexusWorkers) {
    return;
  }

  const pingWorker = new Worker<PingJob>(
    'ping',
    async (job) => {
      console.log(`[worker] ping job ${job.id}: ${job.data.message ?? 'pong'}`);
      return 'pong';
    },
    { connection: getRedis() },
  );

  const knowledgeWorker = new Worker<KnowledgeProcessJob>(
    KNOWLEDGE_QUEUE,
    async (job) => {
      const { sourceId } = job.data;
      console.log(`[worker] knowledge-ingest ${job.id} source=${sourceId} start`);
      await processSource(sourceId);
    },
    { connection: getRedis(), concurrency: 3 },
  );

  const onComplete = (job?: { id?: string }) => console.log(`[worker] job ${job?.id} completed`);
  const onFailed = (job?: { id?: string }, err?: Error) =>
    console.error(`[worker] job ${job?.id} failed:`, err);

  pingWorker.on('completed', onComplete);
  pingWorker.on('failed', onFailed);
  knowledgeWorker.on('completed', onComplete);
  knowledgeWorker.on('failed', onFailed);

  globalForWorkers.nexusWorkers = [pingWorker, knowledgeWorker];
}
