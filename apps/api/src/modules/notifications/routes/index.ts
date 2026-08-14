import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../shared/auth-middleware';
import { createNotificationRoute } from './createNotification';
import { listNotificationsRoute } from './listNotifications';
import { readNotificationRoute } from './readNotification';

export function notificationRoutes() {
  const app = new OpenAPIHono();

  app.use('*', requireAuth);
  app.openapi(listNotificationsRoute.route, listNotificationsRoute.handler);
  app.openapi(createNotificationRoute.route, createNotificationRoute.handler);
  app.openapi(readNotificationRoute.route, readNotificationRoute.handler);

  return app;
}