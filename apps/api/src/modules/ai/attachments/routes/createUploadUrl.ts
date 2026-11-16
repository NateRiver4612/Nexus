import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  attachmentUploadUrlResponseSchema,
  conversationIdParamsSchema,
  createAttachmentUploadUrlSchema,
  errorResponseSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../../auth-middleware';
import { AttachmentService } from '../service';

export const createAttachmentUploadUrlRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/conversations/{conversationId}/attachments/upload-url',
    request: {
      params: conversationIdParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: createAttachmentUploadUrlSchema.openapi('CreateAttachmentUploadUrl'),
          },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: attachmentUploadUrlResponseSchema } },
        description: 'Presigned PUT URL for uploading the file',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Conversation not found',
      },
    },
  }),
  handler: async (c) => {
    const { conversationId } = c.req.valid('param');
    const body = c.req.valid('json');
    const user = getUser(c);

    const result = await AttachmentService(getDb()).createUploadUrl({
      conversationId,
      userId: user.id,
      ...body,
    });

    return c.json(result, 200);
  },
});
