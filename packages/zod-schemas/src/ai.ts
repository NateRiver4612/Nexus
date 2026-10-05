import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';

export const aiSuggestionSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    type: z.string().min(1).max(48).openapi({ example: 'refactor' }),
    title: z.string().min(1).max(255).openapi({ example: 'Extract validation helpers' }),
    description: z
      .string()
      .nullable()
      .openapi({ example: 'Suggest splitting validation into shared utilities' }),
    status: z.enum(['pending', 'accepted', 'dismissed', 'expired']).default('pending'),
    metadata: z.record(z.string(), z.unknown()).default({}),
    expiresAt: z.string().nullable().openapi({ example: '2026-08-19T00:00:00.000Z' }),
    ...timestampSchema,
  })
  .openapi('AiSuggestion');

export const createAiSuggestionSchema = aiSuggestionSchema.pick({
  projectId: true,
  type: true,
  title: true,
  description: true,
  status: true,
  metadata: true,
  expiresAt: true,
});
export const updateAiSuggestionSchema = createAiSuggestionSchema.partial();

export const aiSuggestionListSchema = z.array(aiSuggestionSchema).openapi('AiSuggestions');

export const aiRunSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    userId: z.string().openapi({ example: 'seed@nexus.local' }),
    type: z.string().min(1).max(64).openapi({ example: 'suggest' }),
    status: z.enum(['queued', 'processing', 'completed', 'failed']).default('queued'),
    model: z.string().nullable().openapi({ example: 'claude-sonnet-4' }),
    inputTokens: z.number().int().nonnegative().default(0),
    outputTokens: z.number().int().nonnegative().default(0),
    completedAt: z.string().nullable().openapi({ example: '2026-08-12T00:00:01.000Z' }),
    ...timestampSchema,
  })
  .openapi('AiRun');

export const aiRunListSchema = z.array(aiRunSchema).openapi('AiRuns');

export const conversationSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    userId: z.string().openapi({ example: 'seed@nexus.local' }),
    title: z
      .string()
      .min(1)
      .max(255)
      .default('New conversation')
      .openapi({ example: 'Scope the AI module' }),
    ...timestampSchema,
  })
  .openapi('Conversation');

export const createConversationSchema = conversationSchema.pick({
  projectId: true,
  title: true,
});
export const updateConversationSchema = createConversationSchema.partial();

export const conversationListSchema = z.array(conversationSchema).openapi('Conversations');

export const messageSchema = z
  .object({
    id: idSchema,
    conversationId: idSchema,
    role: z.enum(['user', 'assistant', 'system']).openapi({ example: 'user' }),
    content: z.string().min(1).openapi({ example: 'How should we scope AI runs?' }),
    sourceId: z
      .string()
      .nullable()
      .openapi({ example: 'artifact:3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    ...timestampSchema,
  })
  .openapi('Message');

export const createMessageSchema = messageSchema.pick({
  conversationId: true,
  role: true,
  content: true,
  sourceId: true,
});

export const messageListSchema = z.array(messageSchema).openapi('Messages');
