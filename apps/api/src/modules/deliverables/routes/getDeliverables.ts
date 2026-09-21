import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  deliverableListSchema,
  deliverablesQuerySchema,
  errorResponseSchema,
} from '@nexus/zod-schemas';

import { getDb } from '@nexus/db';

import { DeliverableService } from '../service';

export const getDeliverablesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/',
    request: {
      query: deliverablesQuerySchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: deliverableListSchema } },
        description: 'Deliverables retrieved',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: async (c) => {
    const { projectId } = c.req.valid('query');

    const db = getDb();
    const service = DeliverableService(db);

    const items = await service.list(projectId);
    return c.json(items, 200);
  },
});
