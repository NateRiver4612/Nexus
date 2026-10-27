import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { conversationIdParamsSchema, errorResponseSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { ConversationService } from '../conversations/service';

export const deleteConversationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/conversations/{conversationId}',
    request: {
      params: conversationIdParamsSchema,
    },
    responses: {
      204: {
        description: 'Conversation deleted; messages are removed by cascade',
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
    const user = getUser(c);

    await ConversationService(getDb()).remove({ id: conversationId, userId: user.id });

    return c.body(null, 204);
  },
});
