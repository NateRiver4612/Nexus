import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  deliverableParamsSchema,
  deliverableSchema,
  errorResponseSchema,
} from '@nexus/zod-schemas';

import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { HttpError } from '../../../errors';
import { DeliverableService } from '../service';

export const deleteDeliverableRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/:projectId/:deliverableId',
    request: {
      params: deliverableParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: deliverableSchema } },
        description: 'Deliverable deleted',
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
    getUser(c);

    const db = getDb();
    const service = DeliverableService(db);

    const deleted = await service.remove(projectId, deliverableId);
    if (!deleted) throw HttpError.notFound('Deliverable not found');

    return c.json(deleted, 200);
  },
});
