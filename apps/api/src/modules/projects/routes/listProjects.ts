import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, projectListSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const listProjectsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/',
    security: bearerSecurity,
    responses: {
      200: {
        content: {
          'application/json': { schema: projectListSchema },
        },
        description: 'List projects for the current user',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Project not found',
      },
    },
  }),
  handler: (c) => c.json([], 200),
});
