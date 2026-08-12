import { Hono } from 'hono';

import { requireAuth } from '../../shared/auth-middleware';

export function searchRoutes() {
  const app = new Hono();

  app.use('*', requireAuth);

  app.get('/', (c) => c.json([]));

  return app;
}
