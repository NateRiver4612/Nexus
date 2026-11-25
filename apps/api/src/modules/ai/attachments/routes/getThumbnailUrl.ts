import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  conversationAttachmentParamsSchema,
  errorResponseSchema,
  thumbnailUrlSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../../auth-middleware';
import { AttachmentService } from '../service';

export const getAttachmentThumbnailUrlRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/conversations/{conversationId}/attachments/{attachmentId}/thumbnail-url',
    request: {
      params: conversationAttachmentParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: thumbnailUrlSchema } },
        description:
          'Presigned inline URL for the attachment thumbnail, or null while it is generated',
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

    const result = await AttachmentService(getDb()).getThumbnailUrl({
      conversationId,
      attachmentId,
      userId: user.id,
    });
    return c.json(result, 200);
  },
});
