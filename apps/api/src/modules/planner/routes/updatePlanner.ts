import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  idParamsSchema,
  plannerItemSchema,
  updatePlannerItemSchema,
} from '@nexus/zod-schemas';

export const updatePlannerRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/items/{id}',
    request: {
      params: idParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updatePlannerItemSchema.openapi('UpdatePlannerItem'),
          },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: plannerItemSchema } },
        description: 'Planner item updated',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Planner item not found',
      },
    },
  }),
  handler: (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    return c.json(
      {
        id,
        projectId: body.projectId ?? '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        title: body.title ?? 'Placeholder',
        description: 'description' in body ? (body.description ?? null) : null,
        status: body.status ?? 'todo',
        difficulty: body.difficulty ?? 'medium',
        sortOrder: body.sortOrder ?? 0,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      200,
    );
  },
});
