import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { deliverableListSchema, errorResponseSchema } from '@nexus/zod-schemas';

import { getDb } from '@nexus/db';

import { DeliverableService } from '../service';

export const getSystemDeliverablesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/system',
    responses: {
      200: {
        content: { 'application/json': { schema: deliverableListSchema } },
        description: 'System deliverable catalog retrieved',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: async (c) => {
    const db = getDb();
    const service = DeliverableService(db);

    const items = await service.listSystem();
    return c.json(items, 200);
  },
});
