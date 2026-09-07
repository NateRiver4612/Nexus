import { Redis } from 'ioredis';

import { env } from './env';

const globalForRedis = globalThis as unknown as { nexusRedis?: Redis };

function createRedis() {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
  });
}

export function getRedis() {
  // Reuse a single client across hot-reloading dev servers.
  if (!globalForRedis.nexusRedis) {
    globalForRedis.nexusRedis = createRedis();
  }
  return globalForRedis.nexusRedis;
}
