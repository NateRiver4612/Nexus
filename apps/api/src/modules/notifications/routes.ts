import { Hono } from 'hono';

import { requireAuth } from '../../shared/auth-middleware';

export function notificationRoutes() {
  const app = new Hono();

  app.use('*', requireAuth);

  app.get('/', (c) => c.json([]));
  app.post('/', (c) => c.json({ id: 'placeholder' }, 201));
  app.post('/:id/read', (c) => c.json({ id: c.req.param('id'), readAt: new Date().toISOString() }));

  return app;
}
