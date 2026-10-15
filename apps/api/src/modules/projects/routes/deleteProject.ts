import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  idParamsSchema,
  okSchema,
  successResponseSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { ProjectService } from '../service';

export const deleteProjectRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/{id}',
    request: {
      params: idParamsSchema,
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: successResponseSchema(okSchema) },
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

    const db = getDb();
    const projectService = ProjectService(db);

    await projectService.remove(id);
    return c.json({ data: { ok: true }, message: 'Project deleted' }, 200);
  },
});
