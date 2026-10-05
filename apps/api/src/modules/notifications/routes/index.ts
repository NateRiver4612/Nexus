import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createNotificationRoute } from './createNotification';
import { getNotificationsRoute } from './getNotifications';
import { readNotificationRoute } from './readNotification';

export function notificationRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: getNotificationsRoute.route, handler: getNotificationsRoute.handler },
    { route: createNotificationRoute.route, handler: createNotificationRoute.handler },
    { route: readNotificationRoute.route, handler: readNotificationRoute.handler },
  ] as const);
}
