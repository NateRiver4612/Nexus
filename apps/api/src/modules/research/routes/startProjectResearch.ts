import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  errorResponseSchema,
  projectIdParamsSchema,
  projectResearchRunSchema,
  startProjectResearchInputSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { getProject } from '../../../lib/hono-context';
import { requireProjectAccess } from '../../projects/middlewares';
import { ResearchService } from '../service';

export const startProjectResearchRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/:projectId/research',
    request: {
      params: projectIdParamsSchema,
      body: {
        content: { 'application/json': { schema: startProjectResearchInputSchema } },
      },
    },
    middleware: [requireProjectAccess],
    responses: {
      200: {
        content: { 'application/json': { schema: projectResearchRunSchema } },
        description: 'Research generation started',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Project not found',
      },
      409: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Research is already running for this project',
      },
    },
  }),
  handler: async (c) => {
    const { projectId } = c.req.valid('param');
    const { reason, sourceLimit } = c.req.valid('json');

    const user = getUser(c);
    const project = getProject(c);
    const db = getDb();

    const result = await ResearchService(db).start({
      projectId,
      userId: user.id,
      reason,
      sourceLimit,
      project,
    });

    return c.json(result, 200);
  },
});
