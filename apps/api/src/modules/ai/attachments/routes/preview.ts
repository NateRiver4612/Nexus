import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import { conversationAttachmentParamsSchema, errorResponseSchema } from '@nexus/zod-schemas';
import { getDb } from '@nexus/db';

import { getUser } from '../../../../auth-middleware';
import { toPdfFilename } from '../../../../documents/preview';
import { AttachmentService } from '../service';

const binarySchema = z.string().openapi({ type: 'string', format: 'binary' });

export const getAttachmentPreviewRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/conversations/{conversationId}/attachments/{attachmentId}/preview',
    request: {
      params: conversationAttachmentParamsSchema,
    },
    responses: {
      200: {
        content: { 'application/pdf': { schema: binarySchema } },
        description: 'PDF rendering of the attachment for a faithful in-app preview',
      },
      400: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Attachment type cannot be rendered as a PDF',
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

    const file = await AttachmentService(getDb()).getPreview({
      conversationId,
      attachmentId,
      userId: user.id,
    });

    return c.body(file.body, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${toPdfFilename(file.name).replace(/["\\]/g, '')}"`,
      'Cache-Control': 'private, max-age=60',
    });
  },
});
