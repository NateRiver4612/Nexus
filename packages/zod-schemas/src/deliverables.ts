import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';

export const deliverableKinds = [
  'word_report',
  'spreadsheet',
  'presentation',
  'timeline',
  'meeting_notes',
  'research_summary',
  'financial_model',
  'custom',
] as const;

export const deliverableKindSchema = z.enum(deliverableKinds);

export const deliverableSchema = z
  .object({
    id: idSchema,
    projectId: idSchema.nullable(),
    name: z.string().min(1).max(255).openapi({ example: 'Word report' }),
    kind: deliverableKindSchema,
    isCustom: z.boolean().default(false),
    isSystem: z.boolean().default(true),
    ...timestampSchema,
  })
  .openapi('Deliverable');

// Custom deliverables always belong to a project — system items are seeded, not created.
export const createDeliverableSchema = z.object({
  projectId: idSchema,
  name: z.string().min(1).max(255).openapi({ example: 'Word report' }),
  kind: deliverableKindSchema,
  isCustom: z.boolean().default(false),
});

export const updateDeliverableSchema = createDeliverableSchema.partial();

export const deliverableListSchema = z.array(deliverableSchema).openapi('Deliverables');

/** Attach a set of deliverables (from the shared catalog) to a project. */
export const assignDeliverablesSchema = z.object({
  deliverableIds: z.array(idSchema).min(1),
});

/** Optional project scoping for the catalog listing. */
export const deliverablesQuerySchema = z.object({
  projectId: idSchema.optional(),
});

export const deliverableParamsSchema = z.object({
  projectId: idSchema.openapi({
    param: { name: 'projectId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
  deliverableId: idSchema.openapi({
    param: { name: 'deliverableId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
});
