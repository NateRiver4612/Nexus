import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { idSchema, notificationSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../shared/openapi';

export const readNotificationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/{id}/read',
    security: bearerSecurity,
    request: {
      params: z.object({
        id: idSchema.openapi({
          param: { name: 'id', in: 'path' },
          example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        }),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: notificationSchema } },
        description: 'Notification marked as read',
      },
      401: {
        content: {
          'application/json': {
            schema: z.object({ error: z.object({ type: z.string(), message: z.string() }) }),
          },
        },
        description: 'Authentication required',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({ error: z.object({ type: z.string(), message: z.string() }) }),
          },
        },
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