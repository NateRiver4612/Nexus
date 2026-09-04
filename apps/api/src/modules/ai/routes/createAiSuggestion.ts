import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  aiSuggestionSchema,
  createAiSuggestionSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';

import type { AiSuggestionType } from '@nexus/types';

import { bearerSecurity } from '../../../openapi';

export const createAiSuggestionRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/suggestions/{projectId}',
    security: bearerSecurity,
    request: {
      params: projectIdParamsSchema,
      body: {
        content: {
          'application/json': { schema: createAiSuggestionSchema.openapi('CreateAiSuggestion') },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: aiSuggestionSchema } },
        description: 'AI suggestion created',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Project not found',
      },
    },
  }),
  handler: (c) => {
    const { projectId } = c.req.valid('param');
    const body = c.req.valid('json');
    return c.json(
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        projectId,
        type: body.type,
        title: body.title,
        description: body.description ?? null,
        status: body.status ?? 'pending',
        metadata: body.metadata ?? {},
        createdAt: new Date().toISOString(),
        expiresAt: body.expiresAt ?? null,
      } satisfies AiSuggestionType,
      201,
    );
  },
});
