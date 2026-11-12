import { z } from '@hono/zod-openapi';

import { chatArtifactTypeSchema } from '@nexus/zod-schemas';

import { HttpError } from '../../../errors';
import { ArtifactService } from '../../artifacts/service';
import { defineTool } from '../types';

const MIME_TYPE_BY_TYPE = {
  report: 'text/markdown',
  proposal: 'text/markdown',
  document: 'text/markdown',
  study_guide: 'text/markdown',
  diagram: 'text/vnd.mermaid',
  code: 'text/plain',
} as const satisfies Record<z.infer<typeof chatArtifactTypeSchema>, string>;

// TEMP: hold the "Creating artifact…" stage so it's visible. Remove when done demoing.
const MIN_CREATE_MS = 3000;

/** A filename with a known extension should render as that kind, whatever `type` the model sent. */
function inferTypeFromName(name: string): z.infer<typeof chatArtifactTypeSchema> | undefined {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'document';
  if (ext === 'mmd' || ext === 'mermaid') return 'diagram';
  return undefined;
}

export const createArtifactTool = defineTool({
  name: 'create_artifact',
  label: 'Creating artifact…',
  description:
    "Saves a finished, reusable piece of work in the project so the user can open it later: a report, proposal, document, study guide, diagram, or code file. Use it when the user asks you to write or produce something substantial to keep. Do not use it for answers, explanations or short drafts; reply in chat for those. Call it with exactly the parameters `name`, `type`, and `content`. For a code file, set `type` to `code` and put the filename with its extension (e.g. `Component.tsx`) in `name`. Call it directly when the user asks you to produce a document; don't search first if you already have enough context.",
  parameters: z.object({
    name: z.string().min(1).max(255).describe('name: a short, descriptive title for the artifact.'),
    type: chatArtifactTypeSchema.describe('type: the kind of artifact.'),
    content: z
      .string()
      .min(1)
      .describe(
        'content: the complete artifact text in markdown; for a diagram, only the Mermaid source with no code fences.',
      ),
  }),
  async run({ ctx, args }) {
    // The filename wins over the model's `type` so a `.md`/`.mmd` always renders correctly.
    const type = inferTypeFromName(args.name) ?? args.type;

    try {
      // Project and user come from the conversation, never from the model's arguments.
      const [{ artifact, version }] = await Promise.all([
        ArtifactService(ctx.db).createWithContent({
          input: { projectId: ctx.projectId, name: args.name, type },
          content: args.content,
          mimeType: MIME_TYPE_BY_TYPE[type],
          userId: ctx.userId,
        }),
        new Promise<void>((resolve) => setTimeout(resolve, MIN_CREATE_MS)),
      ]);

      return {
        content: `Saved "${artifact.name}" and it's open for the user. Reply with at most a short confirmation like "Done" — do not summarize or describe the contents.`,
        artifact: { id: artifact.id, name: artifact.name, type, version },
      };
    } catch (error) {
      // A validation message (empty, too large) is something the model can act on; anything
      // else falls through to the loop's generic tool failure.
      if (error instanceof HttpError && error.type === 'ValidationError') {
        return { content: error.message };
      }
      throw error;
    }
  },
});
