import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, projectListSchema } from '@nexus/zod-schemas';

import { getUser } from '../../../auth-middleware';
import { bearerSecurity } from '../../../openapi';
import { list } from '../service';

export const getProjectsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/',
    security: bearerSecurity,
    responses: {
      200: {
        content: {
          'application/json': { schema: projectListSchema },
        },
        description: 'List projects',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: async (c) => {
    const user = getUser(c);
    const projects = await list(user.id);
    return c.json(projects, 200);
  },
});
