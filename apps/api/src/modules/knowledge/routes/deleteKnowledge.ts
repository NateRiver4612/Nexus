import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { idSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../shared/openapi';

export const deleteKnowledgeRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/items/{id}',
    security: bearerSecurity,
    request: {
      params: z.object({
        id: idSchema.openapi({
          param: { name: 'id', in: 'path' },
          example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        }),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: z.object({ ok: z.boolean() }).openapi('Ok') },
        },
        description: 'Knowledge item deleted',
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
        description: 'Knowledge item not found',
      },
    },
  }),
  handler: (c) => {
    c.req.valid('param');
    return c.json({ ok: true }, 200);
  },
});