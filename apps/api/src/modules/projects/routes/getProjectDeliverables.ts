import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  deliverableListSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';

import { getDb } from '@nexus/db';

import { DeliverableService } from '../../deliverables/service';

export const getProjectDeliverablesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:projectId/deliverables',
    request: {
      params: projectIdParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: deliverableListSchema } },
        description: 'Selected project deliverables retrieved',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: async (c) => {
    const { projectId } = c.req.valid('param');

    const db = getDb();
    const service = DeliverableService(db);

    const items = await service.listAssigned(projectId);
    return c.json(items, 200);
  },
});
