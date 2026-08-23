import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, idParamsSchema, notificationSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const readNotificationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/{id}/read',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: notificationSchema } },
        description: 'Notification marked as read',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Notification not found',
      },
    },
  }),
  handler: (c) => {
    const { id } = c.req.valid('param');
    return c.json(
      {
        id,
        projectId: null,
        kind: 'info',
        title: 'Placeholder',
        body: null,
        readAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      200,
    );
  },
});
