import { Worker } from 'bullmq';

import { getDb } from '@nexus/db';
import { getRedis } from '../../redis';
import { deleteKnowledgeObject } from '../../storage';
import { KnowledgeService } from './service';
import {
  KNOWLEDGE_QUEUE,
  KNOWLEDGE_QUEUE_PROCESS,
  KNOWLEDGE_QUEUE_REMOVE,
  type KnowledgeProcessJob,
  type KnowledgeRemoveJob,
} from './queues';
import { onComplete, onFailed } from '../../startWorkers';

const KnowledgeWorker = () => {
  const knowledgeService = KnowledgeService(getDb());

  const knowledgeWorker = new Worker<KnowledgeProcessJob | KnowledgeRemoveJob>(
    KNOWLEDGE_QUEUE,
    async (job) => {
      switch (job.name) {
        case KNOWLEDGE_QUEUE_REMOVE:
          const { storageKey } = job.data as KnowledgeRemoveJob;
          console.log(`[worker] knowledge-remove ${job.id} key=${storageKey}`);
          await deleteKnowledgeObject(storageKey);
          return;
        case KNOWLEDGE_QUEUE_PROCESS: {
          const { sourceId } = job.data as KnowledgeProcessJob;
          const maxAttempts = job.opts.attempts ?? 1;
          // `attemptsMade` counts completed failures, so +1 is the attempt now running.
          // Only the last attempt is allowed to leave the source in `failed`.
          const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
          console.log(`[worker] knowledge-ingest ${job.id} source=${sourceId} start`);
          await knowledgeService.processSource({ sourceId, isFinalAttempt });
          return;
        }
        default:
          throw new Error(`Unknonw job type: ${job.name}`);
      }
    },
    { connection: getRedis(), concurrency: 3 },
  );

  knowledgeWorker.on('completed', onComplete);
  knowledgeWorker.on('failed', onFailed);

  return knowledgeWorker;
};

export default KnowledgeWorker;
