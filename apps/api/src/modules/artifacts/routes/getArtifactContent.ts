import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  artifactContentQuerySchema,
  artifactContentSchema,
  errorResponseSchema,
  idParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getArtifact } from '../../../lib/hono-context';
import { bearerSecurity } from '../../../openapi';
import { requireArtifactAccess } from '../middlewares';
import { ArtifactService } from '../service';

export const getArtifactContentRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/items/{id}/content',
    security: bearerSecurity,
    middleware: [requireArtifactAccess],
    request: {
      params: idParamsSchema,
      query: artifactContentQuerySchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: artifactContentSchema } },
        description: 'Artifact content for one version, with the full version list',
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

    const service = ArtifactService(getDb());
    const [current, versions] = await Promise.all([
      service.getContent({ artifactId: artifact.id, version }),
      service.listVersions(artifact.id),
    ]);

    return c.json({ ...current, versions }, 200);
  },
});
