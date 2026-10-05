import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { aiSuggestionListSchema, errorResponseSchema, projectIdParamsSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const listAiSuggestionsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/suggestions/{projectId}',
    security: bearerSecurity,
    request: {
      params: projectIdParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: aiSuggestionListSchema } },
        description: 'List AI suggestions for a project',
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