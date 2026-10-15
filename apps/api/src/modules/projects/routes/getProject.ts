import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, idParamsSchema, projectDetailSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { ensureExists } from '../../../errors';
import { ProjectService } from '../service';

export const getProjectRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{id}',
    request: {
      params: idParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: projectDetailSchema } },
        description: 'Project retrieved',
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

    const project = ensureExists(await projectService.get(id));
    return c.json(project, 200);
  },
});
