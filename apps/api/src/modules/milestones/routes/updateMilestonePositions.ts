import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  milestonesWithTasksSchema,
  projectIdParamsSchema,
  projectMilestonesTasksSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { MilestoneService } from '../service';

export const updateProjectMilestonePositionsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/:projectId/milestones/positions',
    request: {
      params: projectIdParamsSchema,
      body: {
        content: { 'application/json': { schema: projectMilestonesTasksSchema } },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: milestonesWithTasksSchema } },
        description: 'Milestones and tasks reordered',
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
    const service = MilestoneService(db);

    const milestones = await service.updateMilestonesPositions(projectId, body);
    return c.json(milestones, 200);
  },
});
