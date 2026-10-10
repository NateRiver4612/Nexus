import { createApp } from './app';
import { env } from './env';
import { getRedis } from './redis';
import { startWorkers } from './startWorkers';

startWorkers();

const port = env.PORT;
const server = Bun.serve({ port, fetch: createApp().fetch });

console.log(`@nexus/api running on http://localhost:${server.port}`);
console.log(`Redis ping response: ${await getRedis().ping()}`);
