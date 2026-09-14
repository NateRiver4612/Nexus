import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';
import { ACCEPTED_FILE_TYPES } from './constants';

export const knowledgeSourceType = z.enum([
  'file',
  'url',
  'youtube',
  'copied_text',
  'audio',
  'video',
]);

export const sourceStatus = z.enum(['pending', 'processing', 'ready', 'failed']);

export const knowledgeSourceSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    sourceType: knowledgeSourceType,
    name: z.string().min(1).max(255).openapi({ example: 'research.pdf' }),
    mimeType: z.enum(ACCEPTED_FILE_TYPES).nullish(),
    size: z.number().int().nonnegative(),
    sourceRef: z.string().nullish(),
    storageKey: z.string().nullish(),
    status: sourceStatus.default('pending'),
    errorMessage: z.string().nullish(),
    content: z.string().nullish(),
    ...timestampSchema,
  })
  .openapi('KnowledgeSource');

export const knowledgeSourceListSchema = z.array(knowledgeSourceSchema).openapi('KnowledgeSources');

/** What actually gets created + enqueued for ingestion. */
export const createKnowledgeSourceFileSchema = z.object({
  sourceType: z.literal('file'),
  name: z.string().min(1).max(255),
  mimeType: z.enum(ACCEPTED_FILE_TYPES),
  storageKey: z.string().min(1),
  size: z.number().int().nonnegative().default(0),
});

export const createKnowledgeSourceUrlSchema = z.object({
  sourceType: z.literal('url', {
    error: 'Enter a valid URL',
  }),
  url: z.url('Enter a valid URL.'),
});

export const createKnowledgeSourceYoutubeSchema = z.object({
  sourceType: z.literal('youtube'),
  url: z.url('Enter a valid URL.'),
});

export const createKnowledgeSourceTextSchema = z.object({
  sourceType: z.literal('copied_text'),
  textTitle: z
    .string()
    .min(1, {
      error: 'Title is required',
    })
    .max(255),
  textContent: z
    .string()
    .min(10, {
      error: 'Should have a proper content',
    })
    .max(50_000),
});

export const createKnowledgeSourcesSchema = z
  .array(
    z.discriminatedUnion('sourceType', [
      createKnowledgeSourceFileSchema,
      createKnowledgeSourceUrlSchema,
      createKnowledgeSourceYoutubeSchema,
      createKnowledgeSourceTextSchema,
    ]),
  )
  .openapi('CreateKnowledgeSources');

export const createUploadUrlSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.enum(ACCEPTED_FILE_TYPES),
  size: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024)
    .optional(),
});

export const createUploadUrlResponseSchema = z.object({
  url: z.url({
    error: 'Enter a valid URL',
  }),
  key: z.string(),
  bucket: z.string(),
});

export const deleteKnowledgeResourceSchema = z.object({
  projectId: z.uuid(),
  sourceId: z.uuid(),
});

export const knowledgeItemSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    title: z.string().min(1).max(255).openapi({ example: 'Architecture decisions' }),
    body: z.string().nullable().openapi({ example: 'We chose a modular monolith.' }),
    tags: z
      .array(z.string())
      .default([])
      .openapi({ example: ['architecture', 'nexus'] }),
    ...timestampSchema,
  })
  .openapi('KnowledgeItem');

export const createKnowledgeItemSchema = knowledgeItemSchema.pick({
  projectId: true,
  title: true,
  body: true,
  tags: true,
});

export const updateKnowledgeItemSchema = createKnowledgeItemSchema.partial();

export const knowledgeItemListSchema = z.array(knowledgeItemSchema).openapi('KnowledgeItems');
