import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { idSchema, knowledgeItemSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../shared/openapi';

export const listKnowledgeRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{projectId}',
    security: bearerSecurity,
    request: {
      params: z.object({
        projectId: idSchema.openapi({
          param: { name: 'projectId', in: 'path' },
          example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        }),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: z.array(knowledgeItemSchema).openapi('KnowledgeItems') },
        },
        description: 'List knowledge items for a project',
      },
      401: {
        content: {
          'application/json': {
            schema: z.object({ error: z.object({ type: z.string(), message: z.string() }) }),
          },
        },
        description: 'Authentication required',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({ error: z.object({ type: z.string(), message: z.string() }) }),
          },
        },
        description: 'Knowledge item not found',
      },
    },
  }),
  handler: (c) => c.json([], 200),
});