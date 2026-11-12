import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  artifactSchema,
  errorResponseSchema,
  idParamsSchema,
  updateArtifactSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getArtifact } from '../../../lib/hono-context';
import { bearerSecurity } from '../../../openapi';
import { requireArtifactAccess } from '../middlewares';
import { ArtifactService } from '../service';

export const updateArtifactRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/items/{id}',
    security: bearerSecurity,
    middleware: [requireArtifactAccess],
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
  handler: async (c) => {
    const artifact = getArtifact(c);
    const body = c.req.valid('json');

    const updated = await ArtifactService(getDb()).update(artifact.id, body);

    return c.json(updated, 200);
  },
});
