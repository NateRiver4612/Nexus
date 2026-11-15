import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  artifactSchema,
  createArtifactSchema,
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

export const createArtifactRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/{projectId}',
    security: bearerSecurity,
    middleware: [requireProjectAccess],
    request: {
      params: projectIdParamsSchema,
      body: {
        content: {
          'application/json': { schema: createArtifactSchema.openapi('CreateArtifact') },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: artifactSchema } },
        description: 'Artifact created',
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
    const body = c.req.valid('json');
    const user = getUser(c);
    const db = getDb();

    const conversation = await ConversationService(db).get({
      id: body.conversationId,
      userId: user.id,
    });
    ensure(conversation.projectId === projectId, NotFoundError('Conversation not found.'));

    const artifact = await ArtifactService(db).create({ projectId, ...body }, user.id);

    return c.json(artifact, 201);
  },
});
