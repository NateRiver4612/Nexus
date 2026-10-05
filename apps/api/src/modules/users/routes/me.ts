import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, userSchema } from '@nexus/zod-schemas';

import type { UserType } from '@nexus/types';

import { getUser } from '../../../auth-middleware';
import { bearerSecurity } from '../../../openapi';

export const meRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/me',
    security: bearerSecurity,
    responses: {
      200: {
        content: { 'application/json': { schema: userSchema.openapi('UserType') } },
        description: 'Current user profile',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: (c) => {
    const user = getUser(c);
    return c.json(
      {
        id: user.id,
        email: user.email ?? '',
        name: user.name ?? null,
        image: user.image ?? null,
      } satisfies UserType,
      200,
    );
  },
});
