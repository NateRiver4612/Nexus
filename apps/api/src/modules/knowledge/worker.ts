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

  knowledgeWorker.on('completed', onComplete);
  knowledgeWorker.on('failed', onFailed);

  return knowledgeWorker;
};

export default KnowledgeWorker;
