import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import {
  artifactContentQuerySchema,
  errorResponseSchema,
  idParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { toPdfFilename } from '../../../documents/preview';
import { getArtifact } from '../../../lib/hono-context';
import { bearerSecurity } from '../../../openapi';
import { requireArtifactAccess } from '../middlewares';
import { ArtifactService } from '../service';

const binarySchema = z.string().openapi({ type: 'string', format: 'binary' });

export const getArtifactPreviewRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{id}/preview',
    security: bearerSecurity,
    middleware: [requireArtifactAccess],
    request: {
      params: idParamsSchema,
      query: artifactContentQuerySchema,
    },
    responses: {
      200: {
        content: { 'application/pdf': { schema: binarySchema } },
        description: 'PDF rendering of the artifact version for a faithful in-app preview',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Artifact type cannot be rendered as a PDF',
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

    const file = await ArtifactService(getDb()).getPreview({
      artifactId: artifact.id,
      version,
    });

    return c.body(file.body, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${toPdfFilename(file.name).replace(/["\\]/g, '')}"`,
      'Cache-Control': 'private, max-age=60',
    });
  },
});
