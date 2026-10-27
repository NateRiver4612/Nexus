import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  conversationIdParamsSchema,
  errorResponseSchema,
  messagePageQuerySchema,
  messagePageSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { ConversationService } from '../conversations/service';

export const getMessagesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/conversations/{conversationId}/messages',
    request: {
      params: conversationIdParamsSchema,
      query: messagePageQuerySchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: messagePageSchema } },
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
  handler: async (c) => {
    const { conversationId } = c.req.valid('param');
    const { limit, cursor } = c.req.valid('query');
    const user = getUser(c);

    const page = await ConversationService(getDb()).getMessages({
      conversationId,
      userId: user.id,
      limit,
      cursor,
    });

    return c.json(page, 200);
  },
});
