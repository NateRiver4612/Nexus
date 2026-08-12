import { Hono } from 'hono';

import type { AuthenticatedUser } from '../../shared/auth-middleware';
import { requireAuth } from '../../shared/auth-middleware';

type UserVars = { user?: AuthenticatedUser | undefined };

export function userRoutes() {
  const app = new Hono<{ Variables: UserVars }>();

  app.use('*', requireAuth);

  app.get('/me', (c) => {
    const user = c.get('user');
    return c.json(user ?? null);
  });

  return app;
}
