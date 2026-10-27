import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  conversationIdParamsSchema,
  createMessageSchema,
  errorResponseSchema,
  messageSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { ConversationService } from '../conversations/service';

export const postMessageRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/conversations/{conversationId}/messages',
    request: {
      params: conversationIdParamsSchema,
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
  handler: async (c) => {
    const { conversationId } = c.req.valid('param');
    const { content } = c.req.valid('json');
    const user = getUser(c);

    const message = await ConversationService(getDb()).appendUserMessage({
      conversationId,
      userId: user.id,
      content,
    });

    return c.json(message, 201);
  },
});
