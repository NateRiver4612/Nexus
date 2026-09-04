import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  createMessageSchema,
  errorResponseSchema,
  idParamsSchema,
  messageSchema,
} from '@nexus/zod-schemas';

import type { MessageType } from '@nexus/types';

import { bearerSecurity } from '../../../openapi';

export const postMessageRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/conversations/items/{id}/messages',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
      body: {
        content: {
          'application/json': { schema: createMessageSchema.openapi('CreateMessage') },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: messageSchema } },
        description: 'Message posted',
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
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        conversationId: body.conversationId ?? id,
        role: body.role,
        content: body.content,
        sourceId: body.sourceId ?? null,
        createdAt: new Date().toISOString(),
      } satisfies MessageType,
      201,
    );
  },
});
