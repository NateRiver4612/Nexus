import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  createDeliverableSchema,
  deliverableSchema,
  errorResponseSchema,
} from '@nexus/zod-schemas';

import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { DeliverableService } from '../service';

export const createDeliverableRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/',
    request: {
      body: {
        content: {
          'application/json': { schema: createDeliverableSchema },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: deliverableSchema } },
        description: 'Deliverable created',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: async (c) => {
    const input = c.req.valid('json');
    const user = getUser(c);

    const db = getDb();
    const service = DeliverableService(db);

    const item = await service.create(input, user.id);
    return c.json(item, 201);
  },
});
