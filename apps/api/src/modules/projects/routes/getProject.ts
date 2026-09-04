import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, idParamsSchema, projectSchema } from '@nexus/zod-schemas';

import { HttpError } from '../../../errors';
import { bearerSecurity } from '../../../openapi';
import { get } from '../service';

export const getProjectRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{id}',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: projectSchema } },
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
    const project = await get(id);
    if (!project) throw HttpError.notFound('Project not found');
    return c.json(project, 200);
  },
});
