import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  deliverableParamsSchema,
  deliverableSchema,
  errorResponseSchema,
} from '@nexus/zod-schemas';

import { getDb } from '@nexus/db';

import { requireCustomDeliverable } from '../../deliverables/middlewares';
import { DeliverableService } from '../../deliverables/service';
import { HttpError } from '../../../errors';

export const deleteDeliverableRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/:projectId/deliverables/:deliverableId/delete',
    request: {
      params: deliverableParamsSchema,
    },
    middleware: [requireCustomDeliverable],
    responses: {
      200: {
        content: { 'application/json': { schema: deliverableSchema } },
        description: 'Custom deliverable deleted',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Only custom deliverables can be deleted',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Deliverable not found',
      },
    },
  }),
  handler: async (c) => {
    const { projectId, deliverableId } = c.req.valid('param');

    const db = getDb();
    const service = DeliverableService(db);

    const deleted = await service.removeCustom(projectId, deliverableId);
    if (!deleted) throw HttpError.internal('Deliverable could not be deleted');

    return c.json(deleted, 200);
  },
});
