import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  createKnowledgeSourcesSchema,
  errorResponseSchema,
  knowledgeSourceListSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';

import { getUser } from '../../../auth-middleware';
import { bearerSecurity } from '../../../openapi';
import { KnowledgeService } from '../service';

export const createKnowledgeSourcesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/{projectId}/sources',
    security: bearerSecurity,
    request: {
      params: projectIdParamsSchema,
      body: {
        content: {
          'application/json': { schema: createKnowledgeSourcesSchema },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: knowledgeSourceListSchema } },
        description: 'Knowledge sources created and enqueued for ingestion',
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
    const inputs = c.req.valid('json');
    const user = getUser(c);
    const items = await KnowledgeService().createSources({ projectId, userId: user.id, inputs });
    return c.json(items, 201);
  },
});
