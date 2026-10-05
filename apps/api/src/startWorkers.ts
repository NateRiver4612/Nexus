import { Worker } from 'bullmq';
import { getRedis } from './redis';
import KnowledgeWorker from './modules/knowledge/worker';
import AIWorker from './modules/ai/worker';

const globalForWorkers = globalThis as unknown as {
  nexusWorkers?: Worker[] & {
    startedAt: string;
  };
};

type PingJob = { message?: string };

export const onComplete = (job?: { id?: string }) =>
  console.log(`[worker] job ${job?.id} completed`);

export const onFailed = (job?: { id?: string }, err?: Error) =>
  console.error(`[worker] job ${job?.id} failed:`, err);

export function startWorkers() {
  // Avoid spawning duplicate workers across hot-reloading dev servers.
  if (globalForWorkers.nexusWorkers) {
    console.log(
      '[worker] already started, skipping — worker was created at:',
      globalForWorkers.nexusWorkers.startedAt,
    );
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

  const knowledgeWorkder = KnowledgeWorker();
  const aiWorker = AIWorker();

  pingWorker.on('completed', onComplete);
  pingWorker.on('failed', onFailed);

  globalForWorkers.nexusWorkers = Object.assign([pingWorker, knowledgeWorkder, aiWorker], {
    startedAt: new Date().toISOString(),
  });
}
