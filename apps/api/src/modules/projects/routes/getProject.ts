import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, idParamsSchema, projectDetailSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { HttpError } from '../../../errors';
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

    const project = await projectService.get(id);
    if (!project) throw HttpError.notFound('Project not found');
    return c.json(project, 200);
  },
});
