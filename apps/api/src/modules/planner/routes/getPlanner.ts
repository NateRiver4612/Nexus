import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  plannerItemListSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const getPlannerRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{projectId}',
    security: bearerSecurity,
    request: {
      params: projectIdParamsSchema,
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: plannerItemListSchema },
        },
        description: 'List planner items for a project',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Planner item not found',
      },
    },
  }),
  handler: (c) => c.json([], 200),
});
