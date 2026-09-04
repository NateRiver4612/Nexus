import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  knowledgeSourceListSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';
import { KnowledgeService } from '../service';

export const getKnowledgeSourcesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{projectId}/sources',
    security: bearerSecurity,
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
    const items = await KnowledgeService().listSources(projectId);
    return c.json(items, 200);
  },
});
