import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { userSchema } from '@nexus/zod-schemas';

import { getUser } from '../../../shared/auth-middleware';
import { bearerSecurity } from '../../../shared/openapi';

export const meRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/me',
    security: bearerSecurity,
    responses: {
      200: {
        content: { 'application/json': { schema: userSchema.openapi('User') } },
        description: 'Current user profile',
      },
      401: {
        content: {
          'application/json': {
            schema: z.object({ error: z.object({ type: z.string(), message: z.string() }) }),
          },
        },
        description: 'Authentication required',
      },
    },
  }),
  handler: (c) => c.json(getUser(c), 200),
});