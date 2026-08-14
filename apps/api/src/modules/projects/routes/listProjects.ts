import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { projectSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../shared/openapi';

export const listProjectsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/',
    security: bearerSecurity,
    responses: {
      200: {
        content: {
          'application/json': { schema: z.array(projectSchema).openapi('Projects') },
        },
        description: 'List projects for the current user',
      },
      401: {
        content: {
          'application/json': {
            schema: z.object({ error: z.object({ type: z.string(), message: z.string() }) }),
          },
        },
        description: 'Authentication required',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({ error: z.object({ type: z.string(), message: z.string() }) }),
          },
        },
        description: 'Project not found',
      },
    },
  }),
  handler: (c) => c.json([], 200),
});