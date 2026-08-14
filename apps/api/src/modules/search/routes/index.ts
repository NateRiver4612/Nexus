import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../shared/auth-middleware';
import { searchRoute } from './search';

export function searchRoutes() {
  const app = new OpenAPIHono();

  app.use('*', requireAuth);
  app.openapi(searchRoute.route, searchRoute.handler);

  return app;
}