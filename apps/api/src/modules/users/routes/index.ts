import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../shared/auth-middleware';
import { meRoute } from './me';

export function userRoutes() {
  const app = new OpenAPIHono();

  app.use('*', requireAuth);
  app.openapi(meRoute.route, meRoute.handler);

  return app;
}