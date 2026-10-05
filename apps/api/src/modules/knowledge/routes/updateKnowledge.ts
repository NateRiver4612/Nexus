import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  idParamsSchema,
  knowledgeItemSchema,
  updateKnowledgeItemSchema,
} from '@nexus/zod-schemas';

import type { KnowledgeItemType } from '@nexus/types';

import { bearerSecurity } from '../../../openapi';

export const updateKnowledgeRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/items/{id}',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateKnowledgeItemSchema.openapi('UpdateKnowledgeItem'),
          },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: knowledgeItemSchema } },
        description: 'Knowledge item updated',
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
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    return c.json(
      {
        id,
        projectId: body.projectId ?? '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        title: body.title ?? 'Placeholder',
        body: 'body' in body ? (body.body ?? null) : null,
        tags: 'tags' in body ? (body.tags ?? []) : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies KnowledgeItemType,
      200,
    );
  },
});
