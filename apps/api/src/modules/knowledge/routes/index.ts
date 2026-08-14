import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../shared/auth-middleware';
import { createKnowledgeRoute } from './createKnowledge';
import { deleteKnowledgeRoute } from './deleteKnowledge';
import { listKnowledgeRoute } from './listKnowledge';
import { updateKnowledgeRoute } from './updateKnowledge';

export function knowledgeRoutes() {
  const app = new OpenAPIHono();

  app.use('*', requireAuth);
  app.openapi(listKnowledgeRoute.route, listKnowledgeRoute.handler);
  app.openapi(createKnowledgeRoute.route, createKnowledgeRoute.handler);
  app.openapi(updateKnowledgeRoute.route, updateKnowledgeRoute.handler);
  app.openapi(deleteKnowledgeRoute.route, deleteKnowledgeRoute.handler);

  return app;
}