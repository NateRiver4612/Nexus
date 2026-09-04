import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  idParamsSchema,
  projectSchema,
  updateProjectSchema,
} from '@nexus/zod-schemas';

import { HttpError } from '../../../errors';
import { bearerSecurity } from '../../../openapi';
import { update } from '../service';

export const updateProjectRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/{id}',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
      body: {
        content: {
          'application/json': { schema: updateProjectSchema.openapi('UpdateProject') },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: projectSchema } },
        description: 'Project updated',
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
    const body = c.req.valid('json');

    const project = await update(id, {
      name: body.name,
      slug: body.slug,
      description: body.description,
    });
    if (!project) throw HttpError.notFound('Project not found');
    return c.json(project, 200);
  },
});
