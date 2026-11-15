import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  artifactListQuerySchema,
  artifactListSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import { ensure, NotFoundError } from '../../../errors';
import { bearerSecurity } from '../../../openapi';
import { ConversationService } from '../../ai/conversations/service';
import { requireProjectAccess } from '../../projects/middlewares';
import { ArtifactService } from '../service';

export const getArtifactsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{projectId}',
    security: bearerSecurity,
    middleware: [requireProjectAccess],
    request: {
      params: projectIdParamsSchema,
      query: artifactListQuerySchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: artifactListSchema } },
        description: 'List artifacts for a project',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Artifact not found',
      },
    },
  }),
  handler: async (c) => {
    const { projectId } = c.req.valid('param');
    const { conversationId } = c.req.valid('query');
    const user = getUser(c);
    const db = getDb();

    if (conversationId) {
      // The conversation filter is owner-only; project-wide listing stays membership-based.
      const conversation = await ConversationService(db).get({
        id: conversationId,
        userId: user.id,
      });
      ensure(conversation.projectId === projectId, NotFoundError('Conversation not found.'));
    }

    const artifacts = await ArtifactService(db).list({ projectId, conversationId });
    return c.json(artifacts, 200);
  },
});
