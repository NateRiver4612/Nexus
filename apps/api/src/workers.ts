import { Worker } from 'bullmq';

import { getDb } from '@nexus/db';
import { getRedis } from './redis';
import {
  KNOWLEDGE_QUEUE,
  KNOWLEDGE_QUEUE_PROCESS,
  KNOWLEDGE_QUEUE_REMOVE,
  type KnowledgeProcessJob,
  type KnowledgeRemoveJob,
} from './queues';
import { deleteKnowledgeObject } from './storage';
import { KnowledgeService } from './modules/knowledge/service';

const globalForWorkers = globalThis as unknown as {
  nexusWorkers?: Worker[] & {
    startedAt: string;
  };
};

type PingJob = { message?: string };

export function startWorkers() {
  // Avoid spawning duplicate workers across hot-reloading dev servers.

  if (globalForWorkers.nexusWorkers) {
    console.log(
      '[worker] already started, skipping — worker was created at:',
      globalForWorkers.nexusWorkers.startedAt,
    );
    return;
  }

  const knowledgeService = KnowledgeService(getDb());

  const pingWorker = new Worker<PingJob>(
    'ping',
    async (job) => {
      console.log(`[worker] ping job ${job.id}: ${job.data.message ?? 'pong'}`);
      return 'pong';
    },
    { connection: getRedis() },
  );

  const knowledgeWorker = new Worker<KnowledgeProcessJob | KnowledgeRemoveJob>(
    KNOWLEDGE_QUEUE,
    async (job) => {
      switch (job.name) {
        case KNOWLEDGE_QUEUE_REMOVE:
          const { storageKey } = job.data as KnowledgeRemoveJob;
          console.log(`[worker] knowledge-remove ${job.id} key=${storageKey}`);
          await deleteKnowledgeObject(storageKey);
          return;
        case KNOWLEDGE_QUEUE_PROCESS:
          const { sourceId } = job.data as KnowledgeProcessJob;
          console.log(`[worker] knowledge-ingest ${job.id} source=${sourceId} start`);
          await knowledgeService.processSource(sourceId);
          return;
        default:
          throw new Error(`Unknonw job type: ${job.name}`);
      }
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

  globalForWorkers.nexusWorkers = Object.assign([pingWorker, knowledgeWorker], {
    startedAt: new Date().toISOString(),
  });
}
