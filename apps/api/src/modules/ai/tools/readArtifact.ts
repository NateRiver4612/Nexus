import { z } from '@hono/zod-openapi';

import { ArtifactService } from '../../artifacts/service';
import { defineTool } from '../types';

const MAX_RESULT_CHARS = 16000;

export const readArtifactTool = defineTool({
  name: 'read_artifact',
  label: 'Reading artifact…',
  description:
    'Read the current text of a file you saved earlier in this conversation. Use it when the user asks what is in an existing artifact, wants it shown, or wants it changed. Pass the exact name from the saved-artifacts list. Read before updating so the new version keeps the parts the user did not ask to change. When walking the user through it, keep its headings and order exact and elaborate rather than restate.',
  maxResultChars: MAX_RESULT_CHARS,
  parameters: z.object({
    name: z.string().min(1).max(255).describe('Exact artifact name from the saved-artifacts list.'),
  }),
  async run({ ctx, args }) {
    const service = ArtifactService(ctx.db);
    const artifact = await service.findByName({
      conversationId: ctx.conversationId,
      name: args.name,
    });

    // The lookup is conversation-scoped, but the model supplies the name, so keep the
    // result inside this conversation's project just like get_task does for tasks.
    if (!artifact || artifact.projectId !== ctx.projectId) {
      return {
        content: `Artifact "${args.name}" not found in this conversation. Use the exact name from the saved-artifacts list, or create it.`,
      };
    }

    const { content, version, sources } = await service.getContent({ artifactId: artifact.id });

    return {
      content: JSON.stringify({
        name: artifact.name,
        type: artifact.type,
        version,
        content,
        sources,
      }),
    };
  },
});
