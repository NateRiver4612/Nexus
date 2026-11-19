import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { conversationAttachmentParamsSchema, errorResponseSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../../auth-middleware';
import { AttachmentService } from '../service';

const binarySchema = z.string().openapi({ type: 'string', format: 'binary' });

export const getAttachmentFileRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/conversations/{conversationId}/attachments/{attachmentId}/file',
    request: {
      params: conversationAttachmentParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/octet-stream': { schema: binarySchema } },
        description: 'Raw attachment bytes for an in-app preview',
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

    const file = await AttachmentService(getDb()).getFile({
      conversationId,
      attachmentId,
      userId: user.id,
    });

    // Previews are private to the user and may change until the attachment is sent.
    return c.body(file.body, 200, {
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.name.replace(/["\\]/g, '')}"`,
      'Cache-Control': 'private, max-age=60',
    });
  },
});
