import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  artifactContentQuerySchema,
  errorResponseSchema,
  idParamsSchema,
  thumbnailUrlSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getArtifact } from '../../../lib/hono-context';
import { bearerSecurity } from '../../../openapi';
import { requireArtifactAccess } from '../middlewares';
import { ArtifactService } from '../service';

export const getArtifactThumbnailUrlRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{id}/thumbnail-url',
    security: bearerSecurity,
    middleware: [requireArtifactAccess],
    request: {
      params: idParamsSchema,
      query: artifactContentQuerySchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: thumbnailUrlSchema } },
        description:
          'Presigned inline URL for the artifact version thumbnail, or null while it is generated',
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

    const result = await ArtifactService(getDb()).getThumbnailUrl({
      artifactId: artifact.id,
      version,
    });
    return c.json(result, 200);
  },
});
