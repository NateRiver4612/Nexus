import { Redis } from 'ioredis';

const globalForRedis = globalThis as unknown as { nexusRedis?: Redis };

function createRedis() {
  return new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
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