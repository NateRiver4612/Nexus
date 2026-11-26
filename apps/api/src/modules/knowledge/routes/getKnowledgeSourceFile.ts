import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { deleteKnowledgeResourceSchema, errorResponseSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { KnowledgeService } from '../service';

const binarySchema = z.string().openapi({ type: 'string', format: 'binary' });

export const getKnowledgeSourceFileRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:projectId/sources/:sourceId/file',
    request: {
      params: deleteKnowledgeResourceSchema,
    },
    responses: {
      200: {
        content: { 'application/octet-stream': { schema: binarySchema } },
        description: 'Raw source bytes for an in-app preview',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Knowledge source or stored file not found',
      },
    },
  }),
  handler: async (c) => {
    const { projectId, sourceId } = c.req.valid('param');
    getUser(c);

    const file = await KnowledgeService(getDb()).getFile({ projectId, sourceId });

    // Previews are private to the user; downloads use the presigned endpoint instead.
    return c.body(file.body, 200, {
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.name.replace(/["\\]/g, '')}"`,
      'Cache-Control': 'private, max-age=60',
    });
  },
});
