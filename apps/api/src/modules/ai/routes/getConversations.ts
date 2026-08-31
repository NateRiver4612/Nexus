import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  conversationListSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

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
  handler: (c) => c.json([], 200),
});
