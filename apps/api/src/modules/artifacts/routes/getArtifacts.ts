import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { artifactListSchema, errorResponseSchema, projectIdParamsSchema } from '@nexus/zod-schemas';

import { bearerSecurity } from '../../../openapi';
import type { ArtifactList } from '@nexus/types';

export const getArtifactsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{projectId}',
    security: bearerSecurity,
    request: {
      params: projectIdParamsSchema,
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: artifactListSchema },
        },
        description: 'List artifacts for a project',
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
    const artifaces: ArtifactList = [
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        projectId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        kind: 'note',
        title: 'asdasdasd',
        content: 'asdasdasd',
        metadata: {
          asdad: 'asdasd',
        },
        createdAt: '2026-08-12T00:00:00.000Z',
        updatedAt: '2026-08-12T00:00:00.000Z',
      },
    ];

    return c.json(artifaces, 200);
  },
});
