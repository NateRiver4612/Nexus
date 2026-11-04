import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  projectIdParamsSchema,
  projectResearchListSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireProjectAccess } from '../../projects/middlewares';
import { ResearchService } from '../service';

export const getProjectResearchHistoryRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:projectId/research/history',
    request: {
      params: projectIdParamsSchema,
    },
    middleware: [requireProjectAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: projectResearchListSchema } },
        description: 'All completed research runs for a project, oldest first',
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

    const db = getDb();
    const research = await ResearchService(db).list(projectId);

    return c.json(research, 200);
  },
});
