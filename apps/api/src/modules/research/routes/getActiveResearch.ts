import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  projectIdParamsSchema,
  projectResearchRunResponseSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireProjectAccess } from '../../projects/middlewares';
import { ResearchService } from '../service';

export const getActiveResearchRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:projectId/research/active',
    request: {
      params: projectIdParamsSchema,
    },
    middleware: [requireProjectAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: projectResearchRunResponseSchema } },
        description: 'Active research run, or null when none is running',
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
    const active = await ResearchService(db).getActive(projectId);

    return c.json(active, 200);
  },
});
