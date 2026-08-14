import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { searchQuerySchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../shared/openapi';

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
            schema: z
              .array(
                z.object({
                  type: z.enum(['project', 'planner', 'artifact', 'knowledge']),
                  id: z.string(),
                  title: z.string(),
                  snippet: z.string().nullable(),
                }),
              )
              .openapi('SearchResults'),
          },
        },
        description: 'Search across the workspace',
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
  handler: (c) => c.json([], 200),
});