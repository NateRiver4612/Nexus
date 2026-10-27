import type OpenAI from 'openai';
import z from 'zod';
import { jsonrepair } from 'jsonrepair';

import { AIProviderError, toAIProviderError } from './errors';
import type {
  AIProvider,
  ChatInput,
  ChatMessage,
  DeepSeekChunk,
  StreamEvent,
  ToolCall,
  ToolDef,
  Usage,
} from '../../types';

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

export class DeepSeekProvider implements AIProvider {
  constructor(private readonly getClient: () => OpenAI) {}

  readonly name = 'deepseek';

  async generateText(input: Omit<ChatInput, 'tools'>) {
    try {
      const res = await this.getClient().chat.completions.create(
        buildParams(input) as NonStreaming,
        { signal: input.signal },
      );
      return {
        text: res.choices[0]?.message?.content ?? '',
        usage: toUsage(res.usage) ?? { inputTokens: 0, outputTokens: 0 },
      };
    } catch (err) {
      throw toAIProviderError(err);
    }
  }

  async *streamChat(input: ChatInput): AsyncIterable<StreamEvent> {
    // Tool-call deltas arrive in pieces keyed by `index`; accumulate until the stream ends.
    const pending = new Map<number, { id: string; name: string; args: string }>();
    let finishReason: string | null = null;
    let usage: Usage | undefined;

    try {
      const stream = (await this.getClient().chat.completions.create(
        {
          ...buildParams(input),
          stream: true,
          stream_options: { include_usage: true },
        } as Streaming,
        { signal: input.signal },
      )) as AsyncIterable<DeepSeekChunk>;

      for await (const chunk of stream) {
        usage = toUsage(chunk.usage) ?? usage; // usage rides on a final chunk with empty `choices`

        const choice = chunk.choices[0];

        if (!choice) continue;

        if (choice.delta.content) {
          yield { type: 'text-delta', text: choice.delta.content };
        }

        for (const tc of choice.delta.tool_calls ?? []) {
          const slot = pending.get(tc.index) ?? { id: '', name: '', args: '' };
          if (tc.id) slot.id = tc.id;
          if (tc.function?.name) slot.name = tc.function.name;
          if (tc.function?.arguments) slot.args += tc.function.arguments;
          pending.set(tc.index, slot);
        }
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }
    } catch (err) {
      if (input.signal?.aborted) return; // aborted by the caller: end quietly
      throw toAIProviderError(err);
    }

    // 1.5 flush accumulated tool calls, in index order, one event each
    const calls: ToolCall[] = [...pending.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, slot]) => {
        if (!slot.id || !slot.name) {
          throw new AIProviderError('unknown', 'Stream ended with an incomplete tool call');
        }
        return { id: slot.id, name: slot.name, args: parseArgs(slot.args) };
      });

    for (const call of calls) yield { type: 'tool-call', call };

    if (usage) yield { type: 'usage', usage };

    yield { type: 'finish', reason: mapFinish(finishReason) };
  }
}
