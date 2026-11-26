import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  deleteKnowledgeResourceSchema,
  errorResponseSchema,
  thumbnailUrlSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { KnowledgeService } from '../service';

export const getKnowledgeSourceThumbnailUrlRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:projectId/sources/:sourceId/thumbnail-url',
    request: {
      params: deleteKnowledgeResourceSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: thumbnailUrlSchema } },
        description: 'Presigned inline URL for the source thumbnail, or null while it is generated',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Knowledge source not found',
      },
    },
  }),
  handler: async (c) => {
    const { projectId, sourceId } = c.req.valid('param');
    getUser(c);

    const result = await KnowledgeService(getDb()).getThumbnailUrl({ projectId, sourceId });
    return c.json(result, 200);
  },
});
