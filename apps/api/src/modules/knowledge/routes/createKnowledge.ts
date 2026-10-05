import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  createKnowledgeItemSchema,
  errorResponseSchema,
  knowledgeItemSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const createKnowledgeRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/{projectId}',
    security: bearerSecurity,
    request: {
      params: projectIdParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: createKnowledgeItemSchema.openapi('CreateKnowledgeItem'),
          },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: knowledgeItemSchema } },
        description: 'Knowledge item created',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Knowledge item not found',
      },
    },
  }),
  handler: (c) => {
    const { projectId } = c.req.valid('param');
    const body = c.req.valid('json');
    return c.json(
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        projectId,
        title: body.title,
        body: body.body ?? null,
        tags: body.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      201,
    );
  },
});
