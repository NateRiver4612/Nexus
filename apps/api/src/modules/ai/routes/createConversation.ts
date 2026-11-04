import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  conversationSchema,
  createConversationSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { ConversationService } from '../conversations/service';

export const createConversationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/conversations/{projectId}',
    request: {
      params: projectIdParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: createConversationSchema.openapi('CreateConversation'),
          },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: conversationSchema } },
        description: 'Conversation created',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Project not found',
      },
    },
  }),
  handler: async (c) => {
    const { projectId } = c.req.valid('param');
    const { title } = c.req.valid('json');
    const user = getUser(c);

    const conversation = await ConversationService(getDb()).create({
      projectId,
      userId: user.id,
      title,
    });

    return c.json(conversation, 201);
  },
});
