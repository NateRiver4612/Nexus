import { createApp } from './app';
import { getRedis } from './redis';
import { startWorkers } from './workers';

startWorkers();

const port = Number(process.env.PORT ?? 3001);
const server = Bun.serve({ port, fetch: createApp().fetch });

console.log(`@nexus/api running on http://localhost:${server.port}`);
console.log(`Redis ping response: ${await getRedis().ping()}`);
