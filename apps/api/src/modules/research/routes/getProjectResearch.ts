import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  projectIdParamsSchema,
  projectResearchResponseSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireProjectAccess } from '../../projects/middlewares';
import { ResearchService } from '../service';

export const getProjectResearchRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:projectId/research',
    request: {
      params: projectIdParamsSchema,
    },
    middleware: [requireProjectAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: projectResearchResponseSchema } },
        description: 'Latest project research, or null when none exists',
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
    const research = await ResearchService(db).getLatest(projectId);

    return c.json(research, 200);
  },
});
