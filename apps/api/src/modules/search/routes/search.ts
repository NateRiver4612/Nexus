import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, searchQuerySchema, searchResultsSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const searchRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/',
    security: bearerSecurity,
    request: {
      query: searchQuerySchema.openapi('SearchQuery'),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: searchResultsSchema,
          },
        },
        description: 'Search across the workspace',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: (c) => c.json([], 200),
});
