import { z } from '@hono/zod-openapi';

import { AttachmentService } from '../attachments/service';
import { defineTool } from '../types';

const MAX_SLICE_CHARS = 16_000;

export const readAttachmentTool = defineTool({
  name: 'read_attachment',
  label: 'Reading attachment…',
  description:
    'Read the extracted text of a file the user attached to a message earlier in this conversation. Use it when the user asks about an attached file and its text is not already in the conversation. Pass the exact filename of the attachment. Very long files are truncated; if the answer might be past what you can see, say so.',
  maxResultChars: MAX_SLICE_CHARS + 2_000,
  parameters: z.object({
    name: z.string().min(1).max(255).describe('Exact filename of the attached file.'),
  }),
  async run({ ctx, args }) {
    const attachment = await AttachmentService(ctx.db).findByName({
      conversationId: ctx.conversationId,
      name: args.name,
    });

    // The lookup is conversation-scoped, but the model supplies the name, so keep the result
    // inside this user's attachments.
    if (!attachment || attachment.userId !== ctx.userId) {
      return {
        content: `Attachment "${args.name}" not found in this conversation. Use the exact filename.`,
      };
    }

    const text = attachment.extractedText ?? '';
    const slice = text.slice(0, MAX_SLICE_CHARS);
    const truncated = slice.length < text.length;

    return {
      content: JSON.stringify({
        name: attachment.name,
        mimeType: attachment.mimeType,
        totalChars: text.length,
        truncated,
        content: slice,
      }),
    };
  },
});
