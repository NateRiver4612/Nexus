import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  createUploadUrlResponseSchema,
  createUploadUrlSchema,
  errorResponseSchema,
  projectIdParamsSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { KnowledgeService } from '../service';

export const createUploadUrlRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/{projectId}/sources/upload-url',
    request: {
      params: projectIdParamsSchema,
      body: {
        content: {
          'application/json': { schema: createUploadUrlSchema },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: createUploadUrlResponseSchema } },
        description: 'Presigned PUT URL for uploading the file',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
    },
  }),
  handler: async (c) => {
    const input = c.req.valid('json');

    const db = getDb();
    const knowledgeService = KnowledgeService(db);

    const result = await knowledgeService.getUploadUrl(input);
    return c.json(result, 200);
  },
});
