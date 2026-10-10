import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  assignDeliverablesSchema,
  deliverableListSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';

import { getDb } from '@nexus/db';

import { DeliverableService } from '../../deliverables/service';

export const assignDeliverablesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/:projectId/deliverables',
    request: {
      params: projectIdParamsSchema,
      body: {
        content: { 'application/json': { schema: assignDeliverablesSchema } },
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: deliverableListSchema } },
        description: 'Deliverables attached to the project',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'No deliverables provided',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'A deliverable is not available for this project',
      },
    },
  }),
  handler: async (c) => {
    const { projectId } = c.req.valid('param');
    const { deliverableIds } = c.req.valid('json');

    const db = getDb();
    const service = DeliverableService(db);

    await service.ensureAssignable(projectId, deliverableIds);
    await service.assign(projectId, deliverableIds);

    const items = await service.listAssigned(projectId);
    return c.json(items, 200);
  },
});
