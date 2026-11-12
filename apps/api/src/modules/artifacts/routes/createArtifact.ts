import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  artifactSchema,
  createArtifactSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { bearerSecurity } from '../../../openapi';
import { ArtifactService } from '../service';

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
  handler: async (c) => {
    const { projectId } = c.req.valid('param');
    const body = c.req.valid('json');
    const user = getUser(c);

    const artifact = await ArtifactService(getDb()).create(
      { projectId, name: body.name, type: body.type },
      user.id,
    );

    return c.json(artifact, 201);
  },
});
