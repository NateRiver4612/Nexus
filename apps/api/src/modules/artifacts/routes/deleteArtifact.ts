import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, idParamsSchema, okSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const deleteArtifactRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/items/{id}',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: okSchema },
        },
        description: 'Artifact deleted',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Artifact not found',
      },
    },
  }),
  handler: (c) => {
    c.req.valid('param');
    return c.json({ ok: true }, 200);
  },
});
