import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';

// Mirrors `artifact_type` / `artifact_status` in packages/db/src/schema/artifacts.ts.
export const artifactTypes = [
  'report',
  'presentation',
  'spreadsheet',
  'proposal',
  'pdf',
  'document',
  'diagram',
  'study_guide',
  'code',
] as const;

export const artifactStatuses = ['queued', 'generating', 'ready', 'failed'] as const;

export const artifactTypeSchema = z.enum(artifactTypes);
export const artifactStatusSchema = z.enum(artifactStatuses);

/**
 * The kinds a chat tool can write as plain text. Presentations, spreadsheets and PDFs need a
 * generator behind them, so they stay out until those exist.
 */
export const chatArtifactTypeSchema = artifactTypeSchema.extract([
  'report',
  'proposal',
  'document',
  'study_guide',
  'diagram',
  'code',
]);

export const artifactSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    conversationId: idSchema,
    name: z.string().min(1).max(255).openapi({ example: 'Nexus architecture' }),
    type: artifactTypeSchema.openapi({ example: 'document' }),
    status: artifactStatusSchema.openapi({ example: 'ready' }),
    createdBy: idSchema,
    ...timestampSchema,
  })
  .openapi('Artifact');

// `status` and `createdBy` are server-controlled, so clients never send them.
// `projectId` comes from the route path; the artifact must belong to that project's conversation.
export const createArtifactSchema = artifactSchema.pick({
  conversationId: true,
  name: true,
  type: true,
});
// `projectId`/`conversationId` are excluded: moving an artifact between them would bypass access checks.
export const updateArtifactSchema = createArtifactSchema.pick({ name: true, type: true }).partial();

/** Optional filter; omitting it lists every artifact in the project. */
export const artifactListQuerySchema = z.object({
  conversationId: idSchema.optional(),
});

/** The list carries the newest version so cards can show `v2` without loading content. */
export const artifactListItemSchema = artifactSchema
  .extend({
    latestVersion: z
      .number()
      .int()
      .positive()
      .nullable()
      .openapi({ example: 2, description: 'Newest version, or null before content exists.' }),
  })
  .openapi('ArtifactListItem');

export const artifactListSchema = z.array(artifactListItemSchema).openapi('Artifacts');

/**
 * A web source an artifact drew on. URL + display name only: the model can reliably produce
 * URLs from `web_search`/`read_url`, but it never sees knowledge `sourceId`s.
 */
export const artifactSourceSchema = z
  .object({
    url: z.url(),
    name: z.string().min(1).max(255),
  })
  .openapi('ArtifactSource');

export const artifactSourcesSchema = z.array(artifactSourceSchema);

// `storageKey` is left out on purpose: it is an internal S3 path, not something the client needs.
export const artifactVersionSchema = z
  .object({
    id: idSchema,
    artifactId: idSchema,
    version: z.number().int().positive().openapi({ example: 1 }),
    mimeType: z.string().min(1).max(128).openapi({ example: 'text/markdown' }),
    size: z.number().int().nonnegative().openapi({ example: 2048 }),
    sources: artifactSourcesSchema,
    createdBy: idSchema,
    createdAt: timestampSchema.createdAt,
  })
  .openapi('ArtifactVersion');

export const artifactVersionListSchema = z.array(artifactVersionSchema).openapi('ArtifactVersions');

/** `version` is optional; leaving it out reads the newest one. */
export const artifactContentQuerySchema = z.object({
  version: z.coerce.number().int().positive().optional(),
});

/** One version's text, plus every version so the client can offer a switcher. */
export const artifactContentSchema = z
  .object({
    content: z.string(),
    mimeType: z.string().openapi({ example: 'text/markdown' }),
    version: z.number().int().positive().openapi({ example: 1 }),
    sources: artifactSourcesSchema,
    versions: artifactVersionListSchema,
  })
  .openapi('ArtifactContent');
