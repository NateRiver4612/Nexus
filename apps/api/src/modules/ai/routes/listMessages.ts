import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, idParamsSchema, messageListSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const listMessagesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/conversations/items/{id}/messages',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: messageListSchema } },
        description: 'List messages in a conversation',
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
  handler: (c) => c.json([], 200),
});
