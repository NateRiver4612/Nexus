import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';
import { kickoffPlanSchema } from './planner';
import { chatArtifactTypeSchema } from './artifacts';
import { ACCEPTED_UPLOAD_TYPES, MAX_FILE_SIZE } from './constants';

export const aiTaskEnum = z.enum([
  'rewrite',
  'summarize',
  'classify',
  'project-chat',
  'kickoff',
  'research',
  'artifact-generation',
  'project-health',
]);

/** Coarse progress within a run — the DTO twin of the `ai_run_stage` DB enum. */
export const runStageEnum = z.enum([
  'researching',
  'drafting_milestones',
  'drafting_summary',
  'gathering_context',
  'drafting_artifact',
  'rendering_artifact',
  'saving_artifact',
  'analyzing_project',
  'retrying',
]);

/**
 * Per-task result schemas — the zod-side twin of `AITaskResultMap` in
 * @nexus/types. Adding a task means adding a member here; both
 * `aiTaskDataSchema` (type-level map) and `aiRunDataSchema` (the
 * `aiRun.data` shape) pick it up.
 */
const aiTaskResultSchemas = {
  kickoff: kickoffPlanSchema.nullable(),
};

export const aiTaskDataSchema = z.discriminatedUnion('aiTask', [
  z.object({ aiTask: z.literal('kickoff'), data: aiTaskResultSchemas.kickoff }),
]);

/** Union of every task's result shape — what `aiRun.data` holds. */
export const aiRunDataSchema: z.ZodType<z.output<typeof aiTaskDataSchema>['data']> = z.union([
  aiTaskResultSchemas.kickoff,
]);

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
    aiTask: aiTaskEnum,
    data: aiRunDataSchema,
    status: z.enum(['queued', 'processing', 'completed', 'failed']).default('queued'),
    model: z.string().nullable().openapi({ example: 'claude-sonnet-4' }),
    inputTokens: z.number().int().nonnegative().default(0),
    outputTokens: z.number().int().nonnegative().default(0),
    completedAt: z.string().nullable().openapi({ example: '2026-08-12T00:00:01.000Z' }),
    errorMessage: z.string().nullable().openapi({ example: 'Research timed out' }),
    stage: runStageEnum.nullable().openapi({ example: 'drafting_milestones' }),
    stageUpdatedAt: z.string().nullable().openapi({ example: '2026-08-12T00:00:00.000Z' }),
    startedAt: z.string().nullable().openapi({ example: '2026-08-12T00:00:00.000Z' }),
    ...timestampSchema,
  })
  .openapi('AiRun');

export const aiRunListSchema = z.array(aiRunSchema).openapi('AiRuns');

export const conversationSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    userId: idSchema,
    title: z
      .string()
      .min(1)
      .max(255)
      .default('New conversation')
      .openapi({ example: 'Scope the AI module' }),
    ...timestampSchema,
  })
  .openapi('Conversation');

export const createConversationSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(255)
    .default('New conversation')
    .openapi({ example: 'Scope the AI module' }),
});

/** Renaming is the only conversation update; project ownership comes from the row. */
export const updateConversationSchema = z.object({
  title: z.string().min(1).max(255).openapi({ example: 'Scope the AI module' }),
});

export const conversationListSchema = z.array(conversationSchema).openapi('Conversations');

/** Tool trace + citations land here. Step 5 narrows this. */
export const messageMetadataSchema = z.record(z.string(), z.unknown()).openapi('MessageMetadata');

export const messageSchema = z
  .object({
    id: idSchema,
    conversationId: idSchema,
    role: z.enum(['user', 'assistant', 'system']).openapi({ example: 'user' }),
    content: z.string().openapi({ example: 'How should we scope AI runs?' }),
    sourceId: z
      .string()
      .nullable()
      .openapi({ example: 'artifact:3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    metadata: messageMetadataSchema.nullable(),
    createdAt: timestampSchema.createdAt,
  })
  .openapi('Message');

/** The client sends text plus optional attachment ids; role and conversation come from the server and the path. */
export const createMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1)
    .max(20_000)
    .openapi({ example: 'How should we scope AI runs?' }),
  /** Ids of attachments already confirmed `ready` in this conversation. */
  attachmentIds: z
    .array(idSchema)
    .max(5)
    .default([])
    .openapi({ example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'] }),
});

export const messagePageQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  /** `seq` of the oldest message already loaded; returns the page before it. */
  cursor: z.coerce.number().int().positive().optional(),
});

export const messagePageSchema = z
  .object({
    messages: z.array(messageSchema),
    hasMore: z.boolean(),
    nextCursor: z.number().int().positive().nullable(),
  })
  .openapi('MessagePage');

/**
 * Payloads of the project-chat SSE stream (POST /conversations/{id}/messages).
 * The protocol is locked to `text-delta | tool | sources | done | error`; `tool` and `sources`
 * arrive in Steps 5 and 8. Shared so the API emits and the web client parses the same shapes.
 */
export const chatTextDeltaEventSchema = z.object({ text: z.string() });

export const chatDoneEventSchema = z.object({
  /** The saved assistant message. */
  messageId: idSchema,
  runId: idSchema,
  /** Present only when this reply generated the thread's title. */
  title: z.string().optional(),
});

export const chatErrorEventSchema = z.object({ kind: z.string(), message: z.string() });

/**
 * A source the answer drew on. Streamed in `sources` and stored in `messages.metadata.citations`.
 *
 * The original `{ sourceId, name }` shape only fit knowledge sources. Web results are not DB
 * rows, so they have a URL instead of an id; a union keeps both validated without making
 * either identifier nullable.
 */
const knowledgeCitationSchema = z
  .object({
    // `kind` was added after citations were already stored, so it stays optional and is
    // normalized below; otherwise old messages would stop rendering their sources.
    kind: z.literal('knowledge').optional(),
    sourceId: idSchema,
    name: z.string(),
  })
  .transform((citation) => ({ ...citation, kind: 'knowledge' as const }));

const webCitationSchema = z.object({
  kind: z.literal('web'),
  // The URL is the only stable identity a web result has, so it is also the dedupe key.
  url: z.url(),
  name: z.string(),
  // Display-only. Optional because citations stored before favicons existed must still parse;
  // it stays a plain string so one malformed URL never hides the whole citation list.
  favicon: z.string().nullish(),
});

export const chatCitationSchema = z.union([knowledgeCitationSchema, webCitationSchema]);
export const chatCitationsSchema = z.array(chatCitationSchema);

/** Stable identity for deduping citations: knowledge sources by id, web results by URL. */
export const citationKey = (citation: z.infer<typeof chatCitationSchema>) =>
  citation.kind === 'web' ? citation.url : citation.sourceId;

export const chatToolEventSchema = z.object({
  /** Pairs the `running` event with its `done` / `error` event. */
  id: z.string(),
  name: z.string(),
  /** What the UI shows while it runs, e.g. "Searching knowledge…". */
  label: z.string(),
  status: z.enum(['running', 'done', 'error']),
});

/** Tool calls persisted in `messages.metadata.tools`, so history keeps the trace. */
export const chatToolTraceSchema = z.array(chatToolEventSchema);

export const chatSourcesEventSchema = z.object({ sources: chatCitationsSchema });

/**
 * An artifact the assistant saved this turn. Streamed in `artifact` and stored in
 * `messages.metadata.artifacts`. Only the plain-text kinds (`chatArtifactTypeSchema`) can
 * appear here — generated file formats (presentation, spreadsheet, pdf) have no chat tool.
 */
export const chatArtifactSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(255),
    type: chatArtifactTypeSchema,
    version: z.number().int().positive(),
  })
  .openapi('ChatArtifact');

export const chatArtifactsSchema = z.array(chatArtifactSchema);

export const chatArtifactEventSchema = z.object({ artifact: chatArtifactSchema });

/**
 * Questions the assistant asks the user mid-chat (`ask_user`). Streamed in `question` and stored
 * in `messages.metadata.questions`. The answer is an ordinary next user message, so nothing about
 * answers is stored here: a card counts as answered once a later user message exists.
 */
export const chatQuestionKinds = ['single', 'multiple', 'text'] as const;

export const chatQuestionOptionSchema = z.object({
  label: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
});

export const chatQuestionSchema = z
  .object({
    /** Chosen by the model; it only has to be unique within one call. */
    id: z.string().min(1).max(40),
    prompt: z.string().min(1).max(300),
    kind: z.enum(chatQuestionKinds),
    /** Required for `single` and `multiple`, not allowed for `text`. */
    options: z.array(chatQuestionOptionSchema).min(2).max(4).optional(),
    /** Adds an "Other" free-text choice to a `single` or `multiple` question. */
    allowOther: z.boolean().optional(),
  })
  .superRefine((question, ctx) => {
    if (question.kind === 'text') {
      if (question.options) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'A text question takes no options.',
        });
      }
      if (question.allowOther) {
        ctx.addIssue({
          code: 'custom',
          path: ['allowOther'],
          message: 'A text question is already free text.',
        });
      }
      return;
    }

    if (!question.options) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'A choice question needs 2 to 4 options.',
      });
      return;
    }

    const labels = question.options.map((option) => option.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Option labels must be different.',
      });
    }
  })
  .openapi('ChatQuestion');

/** One call asks 1 to 3 questions, each with its own id. */
export const chatQuestionsSchema = z
  .array(chatQuestionSchema)
  .min(1)
  .max(3)
  .superRefine((questions, ctx) => {
    const ids = questions.map((question) => question.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'Question ids must be different.' });
    }
  });

export const chatQuestionEventSchema = z.object({ questions: chatQuestionsSchema });

/** Mirrors `attachment_status` in packages/db/src/schema/attachments.ts. */
export const attachmentStatusSchema = z.enum(['uploaded', 'processing', 'ready', 'failed']);

/**
 * A file attached to a chat message, as stored in `messages.metadata.attachments`.
 * Only the fields the chip and the model context need; the extracted text stays server-side.
 */
export const chatAttachmentSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(128),
    size: z.number().int().nonnegative(),
  })
  .openapi('ChatAttachment');

export const chatAttachmentsSchema = z.array(chatAttachmentSchema);

/** Request a presigned PUT URL for one attachment in a conversation. */
export const createAttachmentUploadUrlSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.enum(ACCEPTED_UPLOAD_TYPES),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
});

export const attachmentUploadUrlResponseSchema = z.object({
  attachmentId: idSchema,
  url: z.url({ error: 'Enter a valid URL' }),
});

/** Full attachment DTO, returned by confirm so the chip can show ready/failed. */
export const attachmentSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(128),
    size: z.number().int().nonnegative(),
    status: attachmentStatusSchema,
    errorMessage: z.string().nullish(),
  })
  .openapi('Attachment');

/** Path params for attachment endpoints scoped under a conversation. */
export const conversationAttachmentParamsSchema = z.object({
  conversationId: idSchema.openapi({
    param: { name: 'conversationId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
  attachmentId: idSchema.openapi({
    param: { name: 'attachmentId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
});

export const attachmentDownloadUrlSchema = z.object({
  url: z.url({ error: 'Enter a valid URL' }),
});
