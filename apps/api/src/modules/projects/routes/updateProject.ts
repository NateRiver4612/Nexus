import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  projectIdParamsSchema,
  projectSchema,
  successResponseSchema,
  updateProjectSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { ensureExists } from '../../../errors';
import { ProjectService } from '../service';

export const updateProjectRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/:projectId',
    request: {
      params: projectIdParamsSchema,
      body: {
        content: {
          'application/json': { schema: updateProjectSchema.openapi('UpdateProject') },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: successResponseSchema(projectSchema) } },
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
    const { projectId } = c.req.valid('param');
    const body = c.req.valid('json');

    const db = getDb();
    const projectService = ProjectService(db);

    const project = ensureExists(
      await projectService.update(projectId, {
        name: body.name,
        slug: body.slug,
        status: body.status,
        description: body.description,
        category: body.category,
      }),
    );
    return c.json({ data: project, message: 'Project updated' }, 200);
  },
});
