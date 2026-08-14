import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { artifactSchema, createArtifactSchema, idSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../shared/openapi';

export const createArtifactRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/{projectId}',
    security: bearerSecurity,
    request: {
      params: z.object({
        projectId: idSchema.openapi({
          param: { name: 'projectId', in: 'path' },
          example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        }),
      }),
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