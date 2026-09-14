import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { createProjectSchema, errorResponseSchema, projectSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { ProjectService } from '../service';

export const createProjectRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/',
    request: {
      body: {
        content: {
          'application/json': { schema: createProjectSchema.openapi('CreateProject') },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: projectSchema } },
        description: 'Project created',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: async (c) => {
    const body = c.req.valid('json');
    const user = getUser(c);

    const db = getDb();
    const projectService = ProjectService(db);

    const project = await projectService.create(user.id, body);
    return c.json(project, 201);
  },
});
