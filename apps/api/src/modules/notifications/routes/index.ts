import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { createNotificationRoute } from './createNotification';
import { listNotificationsRoute } from './listNotifications';
import { readNotificationRoute } from './readNotification';

export function notificationRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([
    { route: listNotificationsRoute.route, handler: listNotificationsRoute.handler },
    { route: createNotificationRoute.route, handler: createNotificationRoute.handler },
    { route: readNotificationRoute.route, handler: readNotificationRoute.handler },
  ] as const);
}
