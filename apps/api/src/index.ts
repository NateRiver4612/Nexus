import { createApp } from './app';

const port = Number(process.env.PORT ?? 3001);
const server = Bun.serve({ port, fetch: createApp().fetch });
console.log(`@nexus/api running on http://localhost:${server.port}`);
