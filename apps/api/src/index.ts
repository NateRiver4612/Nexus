import { createApp } from './app';
import { env } from './env';
import { getRedis } from './redis';
import { startWorkers } from './startWorkers';

startWorkers();

const port = env.PORT;
// Long SSE streams (chat, artifact generation) can be silent for a while — the default idle
// timeout would close them mid-generation. 255s is Bun's maximum.
const server = Bun.serve({ port, idleTimeout: 255, fetch: createApp().fetch });

console.log(`@nexus/api running on http://localhost:${server.port}`);
console.log(`Redis ping response: ${await getRedis().ping()}`);
