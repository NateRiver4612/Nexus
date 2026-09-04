import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, idParamsSchema, okSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';
import { remove } from '../service';

export const deleteProjectRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/{id}',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: okSchema },
        },
        description: 'Project deleted',
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
  handler: async (c) => {
    const { id } = c.req.valid('param');
    await remove(id);
    return c.json({ ok: true }, 200);
  },
});
