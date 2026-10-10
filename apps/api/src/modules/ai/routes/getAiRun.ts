import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';
import { getDb } from '@nexus/db';

import { aiRunSchema, errorResponseSchema, idParamsSchema } from '@nexus/zod-schemas';
import { AIService } from '../service';

export const getAiRunRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/runs/:id',
    request: {
      params: idParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: aiRunSchema } },
        description: 'AI run retrieved',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'AI run not found',
      },
    },
  }),
  handler: async (c) => {
    const { id } = c.req.valid('param');

    const db = getDb();

    const aiService = AIService(db);

    const aiRun = await aiService.get(id)!;

    return c.json(aiRun, 200);
  },
});
