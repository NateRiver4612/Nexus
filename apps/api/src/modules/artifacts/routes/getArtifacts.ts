import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { artifactListSchema, errorResponseSchema, projectIdParamsSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { bearerSecurity } from '../../../openapi';
import { ArtifactService } from '../service';

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
        content: { 'application/json': { schema: artifactListSchema } },
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
  handler: async (c) => {
    const { projectId } = c.req.valid('param');
    const artifacts = await ArtifactService(getDb()).list(projectId);
    return c.json(artifacts, 200);
  },
});
