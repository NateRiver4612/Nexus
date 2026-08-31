import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createKnowledgeRoute } from './createKnowledge';
import { deleteKnowledgeRoute } from './deleteKnowledge';
import { getKnowledgeRoute } from './getKnowledge';
import { updateKnowledgeRoute } from './updateKnowledge';

export function knowledgeRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: getKnowledgeRoute.route, handler: getKnowledgeRoute.handler },
    { route: createKnowledgeRoute.route, handler: createKnowledgeRoute.handler },
    { route: updateKnowledgeRoute.route, handler: updateKnowledgeRoute.handler },
    { route: deleteKnowledgeRoute.route, handler: deleteKnowledgeRoute.handler },
  ] as const);
}
