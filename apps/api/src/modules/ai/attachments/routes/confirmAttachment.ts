import { createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';

import {
  attachmentSchema,
  conversationAttachmentParamsSchema,
  errorResponseSchema,
} from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../../auth-middleware';
import { AttachmentService } from '../service';

export const confirmAttachmentRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/conversations/{conversationId}/attachments/{attachmentId}/confirm',
    request: {
      params: conversationAttachmentParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/json': { schema: attachmentSchema } },
        description: 'Attachment extraction result (ready or failed)',
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

    const attachment = await AttachmentService(getDb()).confirm({
      conversationId,
      attachmentId,
      userId: user.id,
    });

    return c.json(attachment, 200);
  },
});
