import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  idParamsSchema,
  projectSchema,
  updateProjectSchema,
} from '@nexus/zod-schemas';

import type { Project } from '@nexus/types';

import { bearerSecurity } from '../../../openapi';

export const updateProjectRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/{id}',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
      body: {
        content: {
          'application/json': { schema: updateProjectSchema.openapi('UpdateProject') },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: projectSchema } },
        description: 'Project updated',
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
    const body = c.req.valid('json');

    return c.json(
      {
        id,
        name: body.name ?? 'Placeholder',
        slug: body.slug ?? 'placeholder',
        description: 'description' in body ? (body.description ?? null) : null,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies Project,
      200,
    );
  },
});
