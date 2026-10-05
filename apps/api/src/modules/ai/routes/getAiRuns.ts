import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { aiRunListSchema, errorResponseSchema, projectIdParamsSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const getAiRunsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/runs',
    security: bearerSecurity,
    request: {
      params: projectIdParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: aiRunListSchema } },
        description: 'List AI runs for a project',
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
