import { z } from '@hono/zod-openapi';

import { normalizeUrl } from '@nexus/shared-helpers';
import type { ArtifactSourceType } from '@nexus/types';
import { artifactTypeSchema, chatArtifactTypeSchema } from '@nexus/zod-schemas';

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

async function holdCreatingStage(startedAt: number) {
  const remaining = MIN_CREATE_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

/** A filename with a known extension should render as that kind, whatever `type` the model sent. */
function inferTypeFromName(name: string): z.infer<typeof chatArtifactTypeSchema> | undefined {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'document';
  if (ext === 'mmd' || ext === 'mermaid') return 'diagram';
  return undefined;
}

const UNSUPPORTED_CHAT_TYPES = new Set(['presentation', 'spreadsheet', 'pdf']);

type ResolvedType =
  { ok: true; type: z.infer<typeof chatArtifactTypeSchema> } | { ok: false; error: string };

/** Filename wins; otherwise accept a chat type, reject unsupported formats, coerce typos. */
function resolveType({ name, type }: { name: string; type: string }): ResolvedType {
  const inferred = inferTypeFromName(name);
  if (inferred) return { ok: true, type: inferred };

  const supported = chatArtifactTypeSchema.safeParse(type);
  if (supported.success) return { ok: true, type: supported.data };

  const known = artifactTypeSchema.safeParse(type);
  if (known.success && UNSUPPORTED_CHAT_TYPES.has(known.data)) {
    return {
      ok: false,
      error: `"${known.data}" artifacts are not supported yet. Save it as a document or code file instead. Nothing was saved; do not tell the user it was.`,
    };
  }

  // A typo like "markdown" shouldn't cost the whole artifact.
  return { ok: true, type: 'document' };
}

/** Invalid optional sources must never reject the artifact; keep the valid, deduped URLs. */
function normalizeSources(sources?: { url: string; name?: string }[]): ArtifactSourceType[] {
  const seen = new Set<string>();
  const normalized: ArtifactSourceType[] = [];

  for (const source of sources ?? []) {
    const url = normalizeUrl({ url: source.url });
    if (!url || seen.has(url)) continue;
    seen.add(url);
    normalized.push({ url, name: source.name?.trim() || new URL(url).hostname });
  }

  return normalized;
}

export const createArtifactTool = defineTool({
  name: 'create_artifact',
  label: 'Creating artifact…',
  description:
    'Saves a finished, reusable piece of work in this conversation so the user can open it later: a report, proposal, document, study guide, diagram, or code file. Use it when the user asks you to write or produce something substantial to keep. Do not use it for answers, explanations or short drafts; reply in chat for those. Produce the deliverable the user asked for, not a proposal about it, unless they asked for a proposal. Use the exact filename the user or task named (e.g. `AGENTS.md`); otherwise a short descriptive filename. For a code file, set `type` to `code` and put the filename with its extension (e.g. `Component.tsx`) in `name`. Saving an existing filename adds a new version instead of a duplicate; call it at most once per file per reply. When the artifact draws on current or external facts (a report, proposal, document or study guide), pass the web URLs you actually used as `sources`, each with a short display name; never invent a URL. Omit `sources` for artifacts built purely from the project. Content may use GitHub alerts (> [!NOTE]) and the stats/steps/compare fenced blocks for richer formatting.',
  parameters: z.object({
    name: z
      .string()
      .min(1)
      .max(255)
      .describe(
        'name: the exact filename the user or task named (e.g. AGENTS.md); otherwise a short descriptive filename.',
      ),
    type: z.string().describe('type: the kind of artifact. A typo is coerced to document.'),
    content: z
      .string()
      .min(1)
      .describe(
        'content: the complete artifact text in markdown; for a diagram, only the Mermaid source with no code fences.',
      ),
    sources: z
      .array(z.object({ url: z.string(), name: z.string().optional() }))
      .max(20)
      .optional()
      .describe(
        'sources: the web URLs this artifact drew on (each with a short display name), from web_search or read_url. Invalid URLs are ignored. Omit for artifacts built purely from the project.',
      ),
  }),
  async run({ ctx, args }) {
    // The filename wins over the model's `type` so a `.md`/`.mmd` always renders correctly.
    const name = args.name.trim();
    const resolved = resolveType({ name, type: args.type });
    if (!resolved.ok) return { content: resolved.error, failed: true };

    const type = resolved.type;
    const sources = normalizeSources(args.sources);
    const service = ArtifactService(ctx.db);
    const writeKey = name.toLowerCase();
    const startedAt = Date.now();

    try {
      const previous = ctx.artifactWrites.get(writeKey);
      if (previous) {
        // Same file saved twice in one reply: correct that version instead of adding another.
        const { artifact } = await service.replaceVersionContent({
          artifactId: previous.artifactId,
          version: previous.version,
          content: args.content,
          mimeType: MIME_TYPE_BY_TYPE[previous.type],
          sources,
        });
        await holdCreatingStage(startedAt);

        return {
          content: `Updated "${artifact.name}" saved earlier in this reply. Reply with a short confirmation that names the file, e.g. "Saved ${artifact.name}." — do not summarize or describe the contents.`,
        };
      }

      // Project, conversation and user come from the server context, never from model arguments.
      const existing = await service.findByName({ conversationId: ctx.conversationId, name });
      if (existing) {
        const existingType = chatArtifactTypeSchema.safeParse(existing.type);
        if (!existingType.success) {
          return {
            content: `An artifact named "${existing.name}" already exists with type "${existing.type}". Choose a different filename. Nothing was saved; do not tell the user it was.`,
            failed: true,
          };
        }

        const { artifact, version } = await service.addVersion({
          artifactId: existing.id,
          content: args.content,
          mimeType: MIME_TYPE_BY_TYPE[existingType.data],
          sources,
          userId: ctx.userId,
        });
        ctx.artifactWrites.set(writeKey, {
          artifactId: artifact.id,
          version,
          type: existingType.data,
        });
        await holdCreatingStage(startedAt);

        return {
          content: `Saved a new version of "${artifact.name}" and it's open for the user. Reply with a short confirmation that names the file, e.g. "Saved ${artifact.name}." — do not summarize or describe the contents.`,
          artifact: { id: artifact.id, name: artifact.name, type: existingType.data, version },
        };
      }

      const { artifact, version } = await service.createWithContent({
        input: { projectId: ctx.projectId, conversationId: ctx.conversationId, name, type },
        content: args.content,
        mimeType: MIME_TYPE_BY_TYPE[type],
        sources,
        userId: ctx.userId,
      });
      ctx.artifactWrites.set(writeKey, { artifactId: artifact.id, version, type });
      await holdCreatingStage(startedAt);

      return {
        content: `Saved "${artifact.name}" and it's open for the user. Reply with a short confirmation that names the file, e.g. "Saved ${artifact.name}." — do not summarize or describe the contents.`,
        artifact: { id: artifact.id, name: artifact.name, type, version },
      };
    } catch (error) {
      // A validation message (empty, too large) is something the model can act on; anything
      // else falls through to the loop's generic tool failure.
      if (error instanceof HttpError && error.type === 'ValidationError') {
        return {
          content: `${error.message} Nothing was saved; do not tell the user it was.`,
          failed: true,
        };
      }
      throw error;
    }
  },
});
