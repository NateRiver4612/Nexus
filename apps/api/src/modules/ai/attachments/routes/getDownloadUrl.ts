import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  attachmentDownloadUrlSchema,
  conversationAttachmentParamsSchema,
  errorResponseSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../../auth-middleware';
import { AttachmentService } from '../service';

export const getAttachmentDownloadUrlRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/conversations/{conversationId}/attachments/{attachmentId}/download-url',
    request: {
      params: conversationAttachmentParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: attachmentDownloadUrlSchema } },
        description: 'Presigned GET URL for downloading the file',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Attachment or conversation not found',
      },
    },
  }),
  handler: async (c) => {
    const { conversationId, attachmentId } = c.req.valid('param');
    const user = getUser(c);

    const { url } = await AttachmentService(getDb()).getDownloadUrl({
      conversationId,
      attachmentId,
      userId: user.id,
    });

    return c.json({ url }, 200);
  },
});
