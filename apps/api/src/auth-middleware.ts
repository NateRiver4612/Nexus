import type { MiddlewareHandler } from 'hono';

import auth from './auth';
import { HttpError } from './errors';

export type AuthenticatedUser = {
  id: string;
  email?: string;
  name?: string | null;
  image?: string | null;
};

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    throw HttpError.unauthorized();
  }

  const user: AuthenticatedUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  };

  c.set('user', user);
  await next();
};

export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (session?.user) {
    c.set('user', {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    });
  }

  await next();
};

export function getUser(c: { get: (key: 'user') => unknown }): AuthenticatedUser {
  const user = c.get('user');
  if (!user) throw HttpError.unauthorized();
  return user as AuthenticatedUser;
}
