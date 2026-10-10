import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  deleteKnowledgeResourceSchema,
  errorResponseSchema,
  knowledgeSourceSchema,
} from '@nexus/zod-schemas';

import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { HttpError } from '../../../errors';
import { KnowledgeService } from '../service';

export const deleteKnowledgeSourceRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/:projectId/sources/:sourceId',
    request: {
      params: deleteKnowledgeResourceSchema,
    },
    middleware: [],
    responses: {
      200: {
        content: { 'application/json': { schema: knowledgeSourceSchema } },
        description: 'Knowledge source deleted',
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

    const db = getDb();
    const knowledgeService = KnowledgeService(db);

    const deletedSource = await knowledgeService.deleteSource(projectId, sourceId);
    if (!deletedSource) throw HttpError.notFound('Knowledge source not found');

    return c.json(deletedSource, 200);
  },
});
