import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  artifactSchema,
  errorResponseSchema,
  idParamsSchema,
  updateArtifactSchema,
} from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const updateArtifactRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/items/{id}',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
      body: {
        content: {
          'application/json': { schema: updateArtifactSchema.openapi('UpdateArtifact') },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: artifactSchema } },
        description: 'Artifact updated',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Artifact not found',
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
        kind: body.kind ?? 'note',
        title: body.title ?? 'Placeholder',
        content: 'content' in body ? (body.content ?? null) : null,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      200,
    );
  },
});
