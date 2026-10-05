import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { aiRunSchema, errorResponseSchema, idParamsSchema } from '@nexus/zod-schemas';

import type { AiRunType } from '@nexus/types';

export const getAiRunRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/runs/items/{id}',
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
  handler: (c) => {
    const { id } = c.req.valid('param');
    return c.json(
      {
        id,
        projectId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        userId: 'seed@nexus.local',
        type: 'suggest',
        status: 'completed',
        model: null,
        inputTokens: 0,
        outputTokens: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      } satisfies AiRunType,
      200,
    );
  },
});
