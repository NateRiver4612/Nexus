import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  milestonesWithTasksSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { MilestoneService } from '../service';

export const getProjectMilestonesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:projectId/milestones',
    request: {
      params: projectIdParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: milestonesWithTasksSchema } },
        description: 'Project milestones with their tasks retrieved',
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
    const service = MilestoneService(db);

    const milestones = await service.listMilestones(projectId);
    return c.json(milestones, 200);
  },
});
