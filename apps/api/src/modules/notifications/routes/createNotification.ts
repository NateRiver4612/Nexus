import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { createNotificationSchema, notificationSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../shared/openapi';

export const createNotificationRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/',
    security: bearerSecurity,
    request: {
      body: {
        content: {
          'application/json': {
            schema: createNotificationSchema.openapi('CreateNotification'),
          },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: notificationSchema } },
        description: 'Notification created',
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
    const body = c.req.valid('json');
    return c.json(
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        projectId: body.projectId ?? null,
        kind: body.kind,
        title: body.title,
        body: body.body ?? null,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      201,
    );
  },
});