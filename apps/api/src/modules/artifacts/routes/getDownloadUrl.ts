import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  artifactContentQuerySchema,
  artifactDownloadUrlSchema,
  errorResponseSchema,
  idParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getArtifact } from '../../../lib/hono-context';
import { bearerSecurity } from '../../../openapi';
import { requireArtifactAccess } from '../middlewares';
import { ArtifactService } from '../service';

export const getArtifactDownloadUrlRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{id}/download-url',
    security: bearerSecurity,
    middleware: [requireArtifactAccess],
    request: {
      params: idParamsSchema,
      query: artifactContentQuerySchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: artifactDownloadUrlSchema } },
        description: 'Presigned GET URL for downloading one artifact version',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Artifact or version not found',
      },
    },
  }),
  handler: async (c) => {
    const artifact = getArtifact(c);
    const { version } = c.req.valid('query');

    const { url } = await ArtifactService(getDb()).getDownloadUrl({
      artifactId: artifact.id,
      version,
    });

    return c.json({ url }, 200);
  },
});
