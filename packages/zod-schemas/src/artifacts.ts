import { z } from '@hono/zod-openapi';

import { idSchema } from './common';

export const artifactSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    kind: z.enum(['note', 'doc', 'resource', 'spec']).openapi({ example: 'note' }),
    title: z.string().min(1).max(255).openapi({ example: 'Nexus architecture' }),
    content: z.string().nullable().openapi({ example: 'High level system diagram' }),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    createdAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
  })
  .openapi('Artifact');

export const createArtifactSchema = artifactSchema.pick({
  projectId: true,
  kind: true,
  title: true,
  content: true,
});
export const updateArtifactSchema = createArtifactSchema.partial();

export const artifactListSchema = z.array(artifactSchema).openapi('Artifacts');
