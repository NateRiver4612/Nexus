import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import { errorResponseSchema, idParamsSchema, okSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getArtifact } from '../../../lib/hono-context';
import { bearerSecurity } from '../../../openapi';
import { requireArtifactAccess } from '../middlewares';
import { ArtifactService } from '../service';

export const deleteArtifactRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/items/{id}',
    security: bearerSecurity,
    middleware: [requireArtifactAccess],
    request: {
      params: idParamsSchema,
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: okSchema },
        },
        description: 'Artifact deleted',
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
    await ArtifactService(getDb()).remove(artifact.id);
    return c.json({ ok: true }, 200);
  },
});
