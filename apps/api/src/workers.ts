import { Worker } from 'bullmq';

import { getRedis } from './redis';

const globalForWorkers = globalThis as unknown as { nexusWorkers?: Worker[] };

type PingJob = { message?: string };

export function startWorkers() {
  // Avoid spawning duplicate workers across hot-reloading dev servers.
  if (globalForWorkers.nexusWorkers) {
    return;
  }

  const worker = new Worker<PingJob>(
    'ping',
    async (job) => {
      console.log(`[worker] ping job ${job.id}: ${job.data.message ?? 'pong'}`);
      return 'pong';
    },
    { connection: getRedis() },
  );

  worker.on('completed', (job) => console.log(`[worker] job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[worker] job ${job?.id} failed:`, err));

  globalForWorkers.nexusWorkers = [worker];
}