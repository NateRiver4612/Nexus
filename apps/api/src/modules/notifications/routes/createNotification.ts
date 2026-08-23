import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  createNotificationSchema,
  errorResponseSchema,
  notificationSchema,
} from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

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
