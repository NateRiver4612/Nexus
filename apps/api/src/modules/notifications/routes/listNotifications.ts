import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { notificationSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../shared/openapi';

export const listNotificationsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/',
    security: bearerSecurity,
    responses: {
      200: {
        content: {
          'application/json': { schema: z.array(notificationSchema).openapi('Notifications') },
        },
        description: 'List notifications for the current user',
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
  handler: (c) => c.json([], 200),
});