import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  artifactSchema,
  createArtifactSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';

export const createArtifactRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/{projectId}',
    security: bearerSecurity,
    request: {
      params: projectIdParamsSchema,
      body: {
        content: {
          'application/json': { schema: createArtifactSchema.openapi('CreateArtifact') },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: artifactSchema } },
        description: 'Artifact created',
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
    const { projectId } = c.req.valid('param');
    const body = c.req.valid('json');
    return c.json(
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        projectId,
        kind: body.kind,
        title: body.title,
        content: body.content ?? null,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      201,
    );
  },
});
