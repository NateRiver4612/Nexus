import { OpenAPIHono } from '@hono/zod-openapi';

import { requireAuth } from '../../../auth-middleware';
import { meRoute } from './me';

export function userRoutes() {
  const app = new OpenAPIHono();
  app.use('*', requireAuth);

  return app.openapiRoutes([{ route: meRoute.route, handler: meRoute.handler }] as const);
}
