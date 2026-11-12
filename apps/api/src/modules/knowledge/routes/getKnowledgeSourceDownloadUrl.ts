import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  deleteKnowledgeResourceSchema,
  errorResponseSchema,
  knowledgeSourceDownloadUrlSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { KnowledgeService } from '../service';

export const getKnowledgeSourceDownloadUrlRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/:projectId/sources/:sourceId/download-url',
    request: {
      params: deleteKnowledgeResourceSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: knowledgeSourceDownloadUrlSchema } },
        description: 'Presigned GET URL for the original stored file',
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

    const db = getDb();
    const knowledgeService = KnowledgeService(db);

    const result = await knowledgeService.getDownloadUrl({ projectId, sourceId });
    return c.json(result, 200);
  },
});
