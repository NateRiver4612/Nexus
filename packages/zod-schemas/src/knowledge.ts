import { z } from '@hono/zod-openapi';

import { idSchema } from './common';

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
    createdAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
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
