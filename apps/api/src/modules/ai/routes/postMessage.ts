import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';

import {
  citationKey,
  conversationIdParamsSchema,
  createMessageSchema,
  errorResponseSchema,
} from '@nexus/zod-schemas';
import { getDb, type AiRun, type Db } from '@nexus/db';

import { getUser } from '../../../auth-middleware';
import {
  ConversationService,
  DEFAULT_CONVERSATION_TITLE,
  type ConversationServiceType,
} from '../conversations/service';
import { toAIProviderError, type AIProviderErrorKind } from '../providers/deepseek/errors';
import type { AIProvider, ChatMessage } from '../types';
import { AIService, type AIServiceType } from '../service';
import { getAIProvider } from '../providers';
import { modelForTask } from '../../../lib/client';
import { buildProjectGeneralContext } from '../chat/contextBuilder';
import { buildProjectChatSystemPrompt } from '../prompts/projectChat';
import { streamSSE } from 'hono/streaming';
import type { Context } from 'hono';
import type {
  ChatCitationType,
  ChatTextDeltaEventType,
  ChatDoneEventType,
  ChatErrorEventType,
  ChatSourcesEventType,
  ChatToolEventType,
  Usage,
  ChatToolTraceType,
} from '@nexus/types';
import { generateConversationTitle } from '../chat/generateTitle';
import { runChatLoop } from '../chat/runChatLoop';
import { projectChatTools, webSearchEnabled } from '../tools/registry';

const HISTORY_LIMIT = 20;

const mergeTokens = ({ a, b }: { a: Usage; b: Usage }): Usage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
});

/** What the user sees. Provider messages can leak internals, so we pick the text by kind. */
const userFacingError = (kind: AIProviderErrorKind) => {
  switch (kind) {
    case 'rate_limited':
      return 'The assistant is busy right now. Please try again in a moment.';
    case 'unavailable':
      return 'The assistant is temporarily unavailable. Please try again after a few minutes.';
    default:
      return 'Something went wrong on our side. Please try again.';
  }
};

export const postMessageRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/conversations/{conversationId}/messages',
    request: {
      params: conversationIdParamsSchema,
      body: {
        content: {
          'application/json': { schema: createMessageSchema.openapi('CreateMessage') },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: {
          // Correctly tells OpenAPI that the raw wire format is text chunks
          // No False Promises to Client Generators
          // Flexibility for Mixed Events
          'text/event-stream': {
            schema: z.string().openapi({
              description:
                'SSE stream. Events: `text-delta` {text}, `tool` {id, name, label, status}, `sources` {sources}, `done` {messageId, runId, title?}, `error` {kind, message}.',
            }),
          },
        },
        description: 'Assistant reply, streamed',
      },
      401: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Authentication required',
      },
      404: {
        content: { 'application/json': { schema: errorResponseSchema } },
        description: 'Conversation not found',
      },
    },
  }),
  handler: async (c) => {
    // Request inputs: path id, message body, authenticated user (never model-supplied).
    const { conversationId } = c.req.valid('param');
    const { content } = c.req.valid('json');
    const user = getUser(c);

    const db = getDb();

    const conversationService = ConversationService(db);
    const aiService = AIService(db);

    // Provider + model are chosen server-side per task; callers can't override them.
    const provider = getAIProvider();
    const model = modelForTask('project-chat');

    // Everything that can fail with a normal HTTP error (404 on a missing or foreign
    // conversation) happens before the stream opens. Once streaming starts the status is
    // already 200, so failures from then on can only be reported as `error` events.
    const conversation = await conversationService.get({
      id: conversationId,
      userId: user.id,
    });
    await conversationService.appendUserMessage({ conversationId, userId: user.id, content });

    // Fetch both in parallel: recent history and general project context for the system prompt.
    const [history, projectCard] = await Promise.all([
      // Includes the user message we just saved, oldest first.
      conversationService.getMessages({ conversationId, userId: user.id, limit: HISTORY_LIMIT }),
      buildProjectGeneralContext({ db, projectId: conversation.projectId }),
    ]);

    // Prompt shape:
    //   [{ role: 'system', content: '<project card + instructions>' },
    //    { role: 'user', content: 'Hi' }, { role: 'assistant', content: '…' }, …]
    // Dropping `system` history rows keeps our one system prompt authoritative.
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: buildProjectChatSystemPrompt({
          projectCard,
          today: new Date().toISOString().slice(0, 10),
          webSearchEnabled,
        }),
      },
      ...history.messages.flatMap((message): ChatMessage[] =>
        message.role === 'system' ? [] : [{ role: message.role, content: message.content }],
      ),
    ];

    // Open the run row first so the streamed `done`/`error` events can reference run.id.
    const run = await aiService.startChatRun({
      projectId: conversation.projectId,
      userId: user.id,
      model,
    });

    return streamProjectChat({
      ctx: { c, db, userId: user.id, provider },
      run,
      conversationId,
      content,
      messages,
      conversation,
      model,
      conversations: conversationService,
      aiService,
    });
  },
});

type StreamProjectChatProps = {
  ctx: {
    c: Context;
    db: Db;
    userId: string;
    provider: AIProvider;
  };
  conversationId: string;
  content: string;
  messages: ChatMessage[];
  conversation: {
    id: string;
    projectId: string;
    title: string;
  };
  model: string;
  run: AiRun;
  conversations: ConversationServiceType;
  aiService: AIServiceType;
};

async function streamProjectChat({
  ctx: { c, db, userId, provider },
  conversationId,
  content,
  messages,
  conversation,
  model,
  run,
  conversations,
  aiService,
}: StreamProjectChatProps) {
  return streamSSE(c, async (stream) => {
    // One signal per request: a client disconnect aborts the model stream and any tool run.
    const controller = new AbortController();

    // The HTTP connection closed → stop the upstream stream instead of wasting tokens.
    stream.onAbort(() => {
      controller.abort();
    });

    // Single write path; skips writes after abort. Wire format:
    //   event: text-delta
    //   data: {"text":"…"}
    const send = async (
      event: 'text-delta' | 'tool' | 'sources' | 'done' | 'error',
      data: object,
    ): Promise<void> => {
      if (stream.aborted) {
        return;
      }

      await stream.writeSSE({
        event,
        data: JSON.stringify(data),
      });
    };

    // Accumulators for the whole turn (runChatLoop itself is per-iteration):
    //   text      → full reply, saved as the assistant message
    //   usage     → merged token totals for the run row
    //   toolTrace → persisted metadata: [{ name: 'searchKnowledge', status: 'done' }]
    //   citations → deduped by citationKey: Map<string, ChatCitationType>
    let text = '';
    let usage: Usage = {
      inputTokens: 0,
      outputTokens: 0,
    };
    const toolTrace: ChatToolTraceType = [];
    const citations = new Map<string, ChatCitationType>();

    try {
      // Two levels on purpose: an error from the provider/loop is a normal failure we report
      // to the client; an error from our own save/rename code falls through to the outer catch.
      let failure: ReturnType<typeof toAIProviderError> | undefined;

      try {
        for await (const event of runChatLoop({
          model,
          messages,
          signal: controller.signal,
          ctx: {
            db,
            projectId: conversation.projectId,
            userId,
          },
          provider,
          tools: projectChatTools,
        })) {
          if (event.type === 'text-delta') {
            // Forward the delta, and accumulate locally for the saved message.
            text += event.text;
            await send('text-delta', { text: event.text } satisfies ChatTextDeltaEventType);
          } else if (event.type === 'usage') {
            // Not a wire event — totals only.
            usage = mergeTokens({ a: usage, b: event.usage });
          } else if (event.type === 'tool') {
            // 'running' is UI feedback; only terminal states go into persisted toolTrace.
            if (event.status !== 'running') {
              toolTrace.push({
                id: event.id,
                name: event.name,
                label: event.label,
                status: event.status,
              });
            }

            // Wire shape: { id, name, label, status: 'running' | 'done' | 'error' }
            await send('tool', {
              id: event.id,
              name: event.name,
              label: event.label,
              status: event.status,
            } satisfies ChatToolEventType);
          } else if (event.type === 'sources') {
            // Dedupe so repeated citations collapse in the saved metadata.
            for (const source of event.sources) citations.set(citationKey(source), source);
            await send('sources', { sources: event.sources } satisfies ChatSourcesEventType);
          }
        }
      } catch (err) {
        console.error(err);
        if (!controller.signal.aborted) {
          failure = toAIProviderError(err);
        }
      }

      // aborted → client left; failure → provider/loop error. Either way the reply is partial.
      const aborted = controller.signal.aborted;
      const partial = aborted || failure !== undefined;

      // Keep whatever the user already saw, flagged `partial`, so a reload matches the screen.
      // Nothing is saved if no text arrived. metadata shape:
      //   { runId, partial?: true, tools?: [{ id, name, label, status }], citations?: [...] }
      let messageId: string | undefined;
      if (text.trim()) {
        const saved = await conversations.appendAssistantMessage({
          conversationId,
          userId,
          content: text,
          metadata: {
            runId: run.id,
            ...(partial ? { partial: true } : {}),
            ...(toolTrace.length ? { tools: toolTrace } : {}),
            ...(citations.size ? { citations: [...citations.values()] } : {}),
          },
        });

        messageId = saved.id;
      }

      let title: string | undefined;

      // Auto-title only on a fresh, successful conversation with a saved reply.
      if (!partial && messageId && conversation.title === DEFAULT_CONVERSATION_TITLE) {
        const generated = await generateConversationTitle({
          provider,
          userId,
          conversationId,
          content,
          reply: text,
          signal: controller.signal,
          conversations,
        });

        if (generated.usage) usage = mergeTokens({ a: usage, b: generated.usage });

        title = generated.title;
      }

      if (failure) {
        // Mark the run failed before telling the client, so a reload never sees it as running.
        await aiService.failRun({
          id: run.id,
          usage,
          errorMessage: failure.message,
        });

        // Wire shape: { kind: 'rate_limited' | 'unavailable' | 'unknown', message: <user-facing> }
        await send('error', {
          kind: failure.kind,
          message: userFacingError(failure.kind),
        } satisfies ChatErrorEventType);

        return;
      }

      // Success: persist token totals, then close the stream with `done`.
      await aiService.completeRun({
        id: run.id,
        usage,
      });

      if (!aborted) {
        if (messageId) {
          // Wire shape: { messageId, runId, title? }
          await send('done', {
            messageId,
            runId: run.id,
            title,
          } satisfies ChatDoneEventType);
        } else {
          // Empty reply (no text, no error) still needs a terminal event.
          await send('error', {
            kind: 'unknown',
            message: 'The assistant returned an empty reply. Please try again.',
          } satisfies ChatErrorEventType);
        }
      }
    } catch (err) {
      // Last-resort catch (e.g. save/rename threw): mark the run failed and tell the client.
      // Secondary failures are swallowed so the SSE response can still finish.
      console.error('[project-chat] unexpected failure', err);

      await aiService
        .failRun({
          id: run.id,
          usage,
          errorMessage: String(err),
        })
        .catch(() => undefined);

      await send('error', {
        kind: 'unknown',
        message: userFacingError('unknown'),
      }).catch(() => undefined);
    }
  });
}
