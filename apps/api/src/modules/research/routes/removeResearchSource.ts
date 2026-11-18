import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  projectIdParamsSchema,
  projectResearchSchema,
  removeResearchSourceInputSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { requireProjectAccess } from '../../projects/middlewares';
import { ResearchService } from '../service';

export const removeResearchSourceRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/:projectId/research/sources',
    request: {
      params: projectIdParamsSchema,
      body: {
        content: { 'application/json': { schema: removeResearchSourceInputSchema } },
      },
    },
    middleware: [requireProjectAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: projectResearchSchema } },
        description: 'Research with the source removed',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Invalid source URL',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Project or research not found',
      },
    },
  }),
  handler: async (c) => {
    const { projectId } = c.req.valid('param');
    const { sourceUrl } = c.req.valid('json');

    const db = getDb();
    const research = await ResearchService(db).removeSource({ projectId, sourceUrl });

    return c.json(research, 200);
  },
});
