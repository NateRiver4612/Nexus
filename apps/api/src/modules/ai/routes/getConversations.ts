import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  conversationListSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { bearerSecurity } from '../../../openapi';
import { ConversationService } from '../conversations/service';

export const getConversationsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/conversations/{projectId}',
    security: bearerSecurity,
    request: {
      params: projectIdParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: conversationListSchema } },
        description: 'List conversations for a project',
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
    const user = getUser(c);

    const conversations = await ConversationService(getDb()).list({
      projectId,
      userId: user.id,
    });

    return c.json(conversations, 200);
  },
});
