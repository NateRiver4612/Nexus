import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  conversationSchema,
  errorResponseSchema,
  idParamsSchema,
  updateConversationSchema,
} from '@nexus/zod-schemas';

import type { Conversation } from '@nexus/types';

import { bearerSecurity } from '../../../openapi';

export const updateConversationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/conversations/items/{id}',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateConversationSchema.openapi('UpdateConversation'),
          },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: conversationSchema } },
        description: 'Conversation updated',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Conversation not found',
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
        userId: 'seed@nexus.local',
        title: body.title ?? 'New conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies Conversation,
      200,
    );
  },
});
