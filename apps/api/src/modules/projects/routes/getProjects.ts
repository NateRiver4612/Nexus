import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, projectListSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { ProjectService } from '../service';

export const getProjectsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/',
    responses: {
      200: {
        content: {
          'application/json': { schema: projectListSchema },
        },
        description: 'List projects',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: async (c) => {
    const user = getUser(c);

    const db = getDb();
    const projectService = ProjectService(db);

    const projects = await projectService.list(user.id);
    return c.json(projects, 200);
  },
});
