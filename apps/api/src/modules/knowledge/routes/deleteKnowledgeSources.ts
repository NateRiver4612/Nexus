import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  deleteKnowledgeSourcesSchema,
  errorResponseSchema,
  knowledgeSourceListSchema,
  projectIdParamsSchema,
  successResponseSchema,
} from '@nexus/zod-schemas';

import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { KnowledgeService } from '../service';

export const deleteKnowledgeSourcesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/:projectId/sources',
    request: {
      params: projectIdParamsSchema,
      body: {
        content: { 'application/json': { schema: deleteKnowledgeSourcesSchema } },
      },
    },
    middleware: [],
    responses: {
      200: {
        content: {
          'application/json': { schema: successResponseSchema(knowledgeSourceListSchema) },
        },
        description: 'Knowledge sources deleted',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'No sources provided',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: async (c) => {
    const { projectId } = c.req.valid('param');
    const { sourceIds } = c.req.valid('json');
    getUser(c);

    const db = getDb();
    const knowledgeService = KnowledgeService(db);

    const deletedSources = await knowledgeService.deleteSources(projectId, sourceIds);

    return c.json(
      {
        data: deletedSources,
        message: `${deletedSources.length} ${deletedSources.length === 1 ? 'source' : 'sources'} deleted`,
      },
      200,
    );
  },
});
