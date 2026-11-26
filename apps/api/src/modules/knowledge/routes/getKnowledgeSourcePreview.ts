import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { deleteKnowledgeResourceSchema, errorResponseSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { toPdfFilename } from '../../../documents/preview';
import { KnowledgeService } from '../service';

const binarySchema = z.string().openapi({ type: 'string', format: 'binary' });

export const getKnowledgeSourcePreviewRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:projectId/sources/:sourceId/preview',
    request: {
      params: deleteKnowledgeResourceSchema,
    },
    responses: {
      200: {
        content: { 'application/pdf': { schema: binarySchema } },
        description: 'PDF rendering of the source for a faithful in-app preview',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Source type cannot be rendered as a PDF',
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

    const file = await KnowledgeService(getDb()).getPreview({ projectId, sourceId });

    return c.body(file.body, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${toPdfFilename(file.name).replace(/["\\]/g, '')}"`,
      'Cache-Control': 'private, max-age=60',
    });
  },
});
