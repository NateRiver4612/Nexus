import { Hono } from 'hono';

import { requireAuth } from '../../shared/auth-middleware';

export function projectRoutes() {
  const app = new Hono();

  app.use('*', requireAuth);

  app.get('/', (c) => c.json([]));
  app.post('/', (c) => c.json({ id: 'placeholder' }, 201));
  app.get('/:id', (c) => c.json({ id: c.req.param('id') }));
  app.patch('/:id', (c) => c.json({ id: c.req.param('id') }));
  app.delete('/:id', (c) => c.json({ ok: true }));

  return app;
}
