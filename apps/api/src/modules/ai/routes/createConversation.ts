import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  conversationSchema,
  createConversationSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';

import type { ConversationType } from '@nexus/types';

import { bearerSecurity } from '../../../openapi';

export const createConversationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/conversations/{projectId}',
    security: bearerSecurity,
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
  handler: (c) => {
    const { projectId } = c.req.valid('param');
    const body = c.req.valid('json');
    return c.json(
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        projectId,
        userId: 'seed@nexus.local',
        title: body.title ?? 'New conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies ConversationType,
      201,
    );
  },
});
