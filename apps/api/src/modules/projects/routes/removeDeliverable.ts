import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { deliverableParamsSchema, errorResponseSchema, okSchema } from '@nexus/zod-schemas';

import { getDb } from '@nexus/db';

import { DeliverableService } from '../../deliverables/service';

export const removeDeliverableRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/:projectId/deliverables/:deliverableId/remove',
    request: {
      params: deliverableParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: okSchema } },
        description: 'Deliverable detached from the project',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: async (c) => {
    const { projectId, deliverableId } = c.req.valid('param');

    const db = getDb();
    const service = DeliverableService(db);

    await service.remove(projectId, deliverableId);
    return c.json({ ok: true }, 200);
  },
});
