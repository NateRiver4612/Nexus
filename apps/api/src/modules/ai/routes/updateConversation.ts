import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  conversationIdParamsSchema,
  conversationSchema,
  errorResponseSchema,
  updateConversationSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { bearerSecurity } from '../../../openapi';
import { ConversationService } from '../conversations/service';

export const updateConversationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/conversations/{conversationId}',
    security: bearerSecurity,
    request: {
      params: conversationIdParamsSchema,
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
        description: 'Conversation renamed',
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
    const { title } = c.req.valid('json');
    const user = getUser(c);

    const conversation = await ConversationService(getDb()).rename({
      id: conversationId,
      userId: user.id,
      title,
    });

    return c.json(conversation, 200);
  },
});
