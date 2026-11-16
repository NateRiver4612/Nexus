import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  conversationAttachmentParamsSchema,
  errorResponseSchema,
  okSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../../auth-middleware';
import { AttachmentService } from '../service';

export const deleteAttachmentRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete',
    path: '/conversations/{conversationId}/attachments/{attachmentId}',
    request: {
      params: conversationAttachmentParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: okSchema } },
        description: 'Attachment deleted',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Attachment or conversation not found',
      },
      409: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Attachment is already part of a message',
      },
    },
  }),
  handler: async (c) => {
    const { conversationId, attachmentId } = c.req.valid('param');
    const user = getUser(c);

    await AttachmentService(getDb()).remove({
      conversationId,
      attachmentId,
      userId: user.id,
    });

    return c.json({ ok: true }, 200);
  },
});
