import { OpenAPIHono } from '@hono/zod-openapi';
import { streamSSE } from 'hono/streaming';

import { requireAuth } from '../../../auth-middleware';
import { createKnowledgeRoute } from './createKnowledge';
import { createKnowledgeSourcesRoute } from './createKnowledgeSources';
import { createUploadUrlRoute } from './createUploadUrl';
import { deleteKnowledgeRoute } from './deleteKnowledge';
import { deleteKnowledgeSourceRoute } from './deleteKnowledgeSource';
import { getKnowledgeRoute } from './getKnowledge';
import { getKnowledgeSourcesRoute } from './getKnowledgeSources';
import { updateKnowledgeRoute } from './updateKnowledge';
import { getRedis } from '../../../redis';

export function knowledgeRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  // SSE stream of ingestion progress for a project. Registered outside
  // openapiRoutes because it's a live stream, not a JSON response.
  app.get('/{projectId}/sources/events', (c) => {
    const projectId = c.req.param('projectId');
    const channel = `knowledge:${projectId}`;

    return streamSSE(c, async (stream) => {
      const subscriber = getRedis().duplicate();
      await subscriber.subscribe(channel);

      subscriber.on('message', (_channel, message) => {
        void stream.writeSSE({ event: 'source', data: message });
      });

      const ping = setInterval(() => {
        void stream.writeSSE({ event: 'ping', data: JSON.stringify({ at: Date.now() }) });
      }, 20_000);

      stream.onAbort(() => {
        clearInterval(ping);
        void subscriber.quit();
      });

      // Keep the connection open until the client disconnects.
      await new Promise<void>((resolve) => stream.onAbort(resolve));
    });
  });

  return app.openapiRoutes([
    { route: getKnowledgeRoute.route, handler: getKnowledgeRoute.handler },
    { route: createKnowledgeRoute.route, handler: createKnowledgeRoute.handler },
    { route: updateKnowledgeRoute.route, handler: updateKnowledgeRoute.handler },
    { route: deleteKnowledgeRoute.route, handler: deleteKnowledgeRoute.handler },
    { route: getKnowledgeSourcesRoute.route, handler: getKnowledgeSourcesRoute.handler },
    { route: createKnowledgeSourcesRoute.route, handler: createKnowledgeSourcesRoute.handler },
    { route: createUploadUrlRoute.route, handler: createUploadUrlRoute.handler },
    { route: deleteKnowledgeSourceRoute.route, handler: deleteKnowledgeSourceRoute.handler },
  ] as const);
}
