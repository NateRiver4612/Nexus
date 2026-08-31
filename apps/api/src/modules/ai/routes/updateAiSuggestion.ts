import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  aiSuggestionSchema,
  errorResponseSchema,
  idParamsSchema,
  updateAiSuggestionSchema,
} from '@nexus/zod-schemas';

import type { AiSuggestion } from '@nexus/types';

import { bearerSecurity } from '../../../openapi';

export const updateAiSuggestionRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'patch',
    path: '/suggestions/items/{id}',
    security: bearerSecurity,
    request: {
      params: idParamsSchema,
      body: {
        content: {
          'application/json': { schema: updateAiSuggestionSchema.openapi('UpdateAiSuggestion') },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: aiSuggestionSchema } },
        description: 'AI suggestion updated',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'AI suggestion not found',
      },
    },
  }),
  handler: (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    return c.json(
      {
        id,
        projectId: body.projectId ?? '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        type: body.type ?? 'refactor',
        title: body.title ?? 'Placeholder',
        description: 'description' in body ? (body.description ?? null) : null,
        status: body.status ?? 'pending',
        metadata: body.metadata ?? {},
        createdAt: new Date().toISOString(),
        expiresAt: 'expiresAt' in body ? (body.expiresAt ?? null) : null,
      } satisfies AiSuggestion,
      200,
    );
  },
});
