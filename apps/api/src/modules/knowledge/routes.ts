import { Hono } from 'hono';

import { requireAuth } from '../../shared/auth-middleware';

export function knowledgeRoutes() {
  const app = new Hono();

  app.use('*', requireAuth);

  app.get('/:projectId', (c) => c.json([]));
  app.post('/:projectId', (c) => c.json({ id: 'placeholder' }, 201));
  app.patch('/items/:id', (c) => c.json({ id: c.req.param('id') }));
  app.delete('/items/:id', (c) => c.json({ ok: true }));

  return app;
}
