import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, notificationListSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const listNotificationsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/',
    security: bearerSecurity,
    responses: {
      200: {
        content: {
          'application/json': { schema: notificationListSchema },
        },
        description: 'List notifications for the current user',
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
  handler: (c) => c.json([], 200),
});
