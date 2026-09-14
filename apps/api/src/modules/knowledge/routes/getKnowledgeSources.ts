import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  knowledgeSourceListSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { KnowledgeService } from '../service';

export const getKnowledgeSourcesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{projectId}/sources',
    request: {
      params: projectIdParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: knowledgeSourceListSchema } },
        description: 'List knowledge sources for a project',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Project not found',
      },
    },
  }),
  handler: async (c) => {
    const { projectId } = c.req.valid('param');

    const db = getDb();
    const knowledgeService = KnowledgeService(db);

    const items = await knowledgeService.listSources(projectId);
    return c.json(items, 200);
  },
});
