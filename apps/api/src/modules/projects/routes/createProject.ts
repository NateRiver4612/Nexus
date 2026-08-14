import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { createProjectSchema, projectSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../shared/openapi';

export const createProjectRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/',
    security: bearerSecurity,
    request: {
      body: {
        content: {
          'application/json': { schema: createProjectSchema.openapi('CreateProject') },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: projectSchema } },
        description: 'Project created',
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
        description: 'Project not found',
      },
    },
  }),
  handler: (c) => {
    const body = c.req.valid('json');
    return c.json(
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      201,
    );
  },
});