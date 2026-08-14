import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { idSchema, plannerItemSchema, updatePlannerItemSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../shared/openapi';

export const updatePlannerRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/items/{id}',
    security: bearerSecurity,
    request: {
      params: z.object({
        id: idSchema.openapi({
          param: { name: 'id', in: 'path' },
          example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        }),
      }),
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
        content: {
          'application/json': {
            schema: z.object({ error: z.object({ type: z.string(), message: z.string() }) }),
          },
        },
        description: 'Authentication required',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({ error: z.object({ type: z.string(), message: z.string() }) }),
          },
        },
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
        description: 'description' in body ? body.description ?? null : null,
        status: body.status ?? 'todo',
        priority: body.priority ?? 'medium',
        sortOrder: body.sortOrder ?? 0,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      200,
    );
  },
});