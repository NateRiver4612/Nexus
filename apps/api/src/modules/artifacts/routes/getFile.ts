import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import {
  artifactContentQuerySchema,
  errorResponseSchema,
  idParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getArtifact } from '../../../lib/hono-context';
import { bearerSecurity } from '../../../openapi';
import { requireArtifactAccess } from '../middlewares';
import { ArtifactService } from '../service';

const binarySchema = z.string().openapi({ type: 'string', format: 'binary' });

export const getArtifactFileRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/items/{id}/file',
    security: bearerSecurity,
    middleware: [requireArtifactAccess],
    request: {
      params: idParamsSchema,
      query: artifactContentQuerySchema,
    },
    responses: {
      200: {
        content: { 'application/octet-stream': { schema: binarySchema } },
        description: 'Raw artifact bytes for an in-app preview',
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

    const file = await ArtifactService(getDb()).getFile({ artifactId: artifact.id, version });

    return c.body(file.body, 200, {
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${artifact.name.replace(/["\\]/g, '')}"`,
      'Cache-Control': 'private, max-age=60',
    });
  },
});
