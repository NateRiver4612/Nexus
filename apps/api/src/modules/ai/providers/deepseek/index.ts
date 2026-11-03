import type OpenAI from 'openai';
import z from 'zod';
import { jsonrepair } from 'jsonrepair';

import { AIProviderError, toAIProviderError, type AIProviderErrorKind } from './errors';
import type {
  AIProvider,
  ChatInput,
  ChatMessage,
  DeepSeekChunk,
  StreamEvent,
  ToolCall,
  ToolDef,
} from '../../types';
import type { Usage } from '@nexus/types';

type Streaming = OpenAI.Chat.ChatCompletionCreateParamsStreaming;
type NonStreaming = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;

// ── 1.2 message / tool mapping ────────────────────────────────────────────────

export function toOpenAIMessages(
  messages: ChatMessage[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
    switch (m.role) {
      case 'system':
        return { role: 'system', content: m.content };
      case 'user':
        return { role: 'user', content: m.content };
      case 'assistant':
        return {
          role: 'assistant',
          content: m.content || null,
          ...(m.toolCalls?.length
            ? {
                tool_calls: m.toolCalls.map((c) => ({
                  id: c.id,
                  type: 'function' as const,
                  function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) },
                })),
              }
            : {}),
        };
      case 'tool':
        return { role: 'tool', tool_call_id: m.toolCallId, content: m.content };
    }
  });
}

function toOpenAITools(tools: ToolDef[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: z.toJSONSchema(t.parameters) as Record<string, unknown>,
    },
  }));
}

function buildParams(input: Omit<ChatInput, 'signal'>) {
  return {
    model: input.model,
    messages: toOpenAIMessages(input.messages),
    max_completion_tokens: input.maxTokens,
    // DeepSeek-only field. Disabled for v1, same as kickoff.
    thinking: { type: 'disabled' },
    ...(input.tools?.length ? { tools: toOpenAITools(input.tools) } : {}),
  };
}

function toUsage(
  u?: { prompt_tokens?: number; completion_tokens?: number } | null,
): Usage | undefined {
  if (!u) return undefined;
  return { inputTokens: u.prompt_tokens ?? 0, outputTokens: u.completion_tokens ?? 0 };
}

export function parseArgs(raw: string): unknown {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(jsonrepair(raw));
    } catch (cause) {
      throw new AIProviderError(
        'unknown',
        `Model returned malformed tool arguments: ${raw.slice(0, 500)}`,
        {
          cause,
        },
      );
    }
  }
}

export function mapFinish(reason: string | null): 'stop' | 'tool_calls' | 'length' {
  if (reason === 'tool_calls') return 'tool_calls';
  if (reason === 'length') return 'length';
  return 'stop';
}

/** Transient upstream failures are worth another attempt; bad requests/config are not. */
const isRetryable = (kind: AIProviderErrorKind) => kind === 'unavailable' || kind === 'rate_limited';

const BASE_RETRY_DELAY_MS = 500;

/** Abort-aware sleep so a pending retry can't outlive a cancelled turn. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Retries only while opening the request (429/5xx/network). Once the stream is returned we stop:
 * replaying it would duplicate output. Callers opt in via `retries`; queued workflows leave it at 0
 * because BullMQ owns their attempts/backoff.
 */
async function withRetries<T>({
  retries,
  signal,
  run,
}: {
  retries: number;
  signal?: AbortSignal;
  run: () => Promise<T>;
}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (err) {
      const failure = toAIProviderError(err);

      if (signal?.aborted || attempt >= retries || !isRetryable(failure.kind)) {
        throw failure;
      }

      // 500ms, 1s, 2s… plus jitter so simultaneous turns don't retry in lockstep.
      await sleep(BASE_RETRY_DELAY_MS * 2 ** attempt + Math.random() * 100, signal);
    }
  }
}

export class DeepSeekProvider implements AIProvider {
  constructor(private readonly getClient: () => OpenAI) {}

  readonly name = 'deepseek';

  async generateText(input: Omit<ChatInput, 'tools'>) {
    try {
      const res = await withRetries({
        retries: input.retries ?? 0,
        signal: input.signal,
        run: () =>
          this.getClient().chat.completions.create(buildParams(input) as NonStreaming, {
            signal: input.signal,
          }),
      });
      return {
        text: res.choices[0]?.message?.content ?? '',
        usage: toUsage(res.usage) ?? { inputTokens: 0, outputTokens: 0 },
      };
    } catch (err) {
      throw toAIProviderError(err);
    }
  }

  async *streamChat(input: ChatInput): AsyncIterable<StreamEvent> {
    // Tool-call deltas arrive in pieces keyed by `index`; several calls can be interleaved, and
    // nothing marks one complete until the stream ends. Half-finished JSON can't be run, so collect
    // every piece here and emit complete calls only after the loop (see flush below). Example:
    //   { index: 0, id: 'call_1', function: { name: 'searchKnowledge', arguments: '{"qu' } }
    //   { index: 0, function: { arguments: 'ery":"auth"}' } }
    const pending = new Map<number, { id: string; name: string; args: string }>();
    // finish_reason / usage only appear on the last chunks, so capture them in the loop.
    let finishReason: string | null = null;
    let usage: Usage | undefined;

    try {
      // `include_usage` makes DeepSeek send a final empty-choices chunk carrying token counts.
      const stream = (await withRetries({
        retries: input.retries ?? 0,
        signal: input.signal,
        run: () =>
          this.getClient().chat.completions.create(
            {
              ...buildParams(input),
              stream: true,
              stream_options: { include_usage: true },
            } as Streaming,
            { signal: input.signal },
          ),
      })) as AsyncIterable<DeepSeekChunk>;

      for await (const chunk of stream) {
        usage = toUsage(chunk.usage) ?? usage; // usage rides on a final chunk with empty `choices`

        // Usage-only chunks have no choices; everything else carries a delta.
        const choice = chunk.choices[0];

        if (!choice) continue;

        if (choice.delta.content) {
          // Chat text arrives incrementally → one `text-delta` per chunk.
          yield { type: 'text-delta', text: choice.delta.content };
        }

        // Same call can span many chunks; keyed by index. Only `arguments` is cumulative.
        for (const tc of choice.delta.tool_calls ?? []) {
          const slot = pending.get(tc.index) ?? { id: '', name: '', args: '' };
          if (tc.id) slot.id = tc.id;
          if (tc.function?.name) slot.name = tc.function.name;
          // Arguments are cumulative: append each fragment.
          if (tc.function?.arguments) slot.args += tc.function.arguments;
          pending.set(tc.index, slot);
        }
        // 'tool_calls' → more work next turn; 'stop' → the answer is complete.
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }
    } catch (err) {
      if (input.signal?.aborted) return; // aborted by the caller: end quietly
      throw toAIProviderError(err);
    }

    // Stream is over, so every call is complete and its JSON parseable. Flush them sorted by index
    // to match the model's request order.
    const calls: ToolCall[] = [...pending.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, slot]) => {
        // A truncated stream can leave a call without id/name — treat it as a provider error.
        if (!slot.id || !slot.name) {
          throw new AIProviderError('unknown', 'Stream ended with an incomplete tool call');
        }
        // `slot.args` is a JSON string (possibly malformed); parseArgs repairs or throws.
        return { id: slot.id, name: slot.name, args: parseArgs(slot.args) };
      });

    // Emit in a fixed order so callers can rely on it:
    //   { type: 'tool-call', call }* → { type: 'usage' }? → { type: 'finish', reason }
    for (const call of calls) yield { type: 'tool-call', call };

    if (usage) yield { type: 'usage', usage };

    yield { type: 'finish', reason: mapFinish(finishReason) };
  }
}
