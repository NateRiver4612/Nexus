import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, idParamsSchema, projectSchema } from '@nexus/zod-schemas';

import type { Project } from '@nexus/types';

import { bearerSecurity } from '../../../openapi';

export const getProjectRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{id}',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: projectSchema } },
        description: 'Project retrieved',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Project not found',
      },
    },
  }),
  handler: (c) => {
    const { id } = c.req.valid('param');
    return c.json(
      {
        id,
        name: 'Placeholder',
        slug: 'placeholder',
        description: null,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies Project,
      200,
    );
  },
});
