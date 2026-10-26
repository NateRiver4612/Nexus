import type OpenAI from 'openai';

import type { DeepSeekChunk } from '../../../types';

type FakeCreate = (params: Record<string, unknown>, options?: { signal?: AbortSignal }) => unknown;

export const fakeClient = (create: FakeCreate): OpenAI =>
  ({ chat: { completions: { create } } }) as unknown as OpenAI;

type ChunkSource = DeepSeekChunk[] | ((signal?: AbortSignal) => AsyncIterable<DeepSeekChunk>);

export const fakeStreamingClient = (
  chunks: ChunkSource,
  onParams?: (params: Record<string, unknown>) => void,
): OpenAI =>
  fakeClient(async (params, options) => {
    onParams?.(params);
    if (typeof chunks === 'function') return chunks(options?.signal);
    return (async function* () {
      yield* chunks;
    })();
  });

export const fakeGenerateClient = (response: unknown): OpenAI => fakeClient(async () => response);

const base = {
  id: 'chunk',
  object: 'chat.completion.chunk' as const,
  created: 0,
  model: 'test-model',
};

type FinishReason = DeepSeekChunk['choices'][number]['finish_reason'];

export const chunk = (choice: DeepSeekChunk['choices'][number]): DeepSeekChunk => ({
  ...base,
  choices: [choice],
});

export const textChunk = (content: string, finishReason: FinishReason = null): DeepSeekChunk =>
  chunk({ index: 0, delta: { content }, finish_reason: finishReason });

export const finishChunk = (finishReason: FinishReason): DeepSeekChunk =>
  chunk({ index: 0, delta: {}, finish_reason: finishReason });

export const toolCallChunk = ({
  index,
  id,
  name,
  args,
}: {
  index: number;
  id?: string;
  name?: string;
  args?: string;
}): DeepSeekChunk =>
  chunk({
    index: 0,
    delta: {
      tool_calls: [
        {
          index,
          ...(id ? { id } : {}),
          ...(name || args !== undefined
            ? {
                function: {
                  ...(name ? { name } : {}),
                  ...(args !== undefined ? { arguments: args } : {}),
                },
              }
            : {}),
        },
      ],
    },
    finish_reason: null,
  });

export const usageChunk = (inputTokens: number, outputTokens: number): DeepSeekChunk => ({
  ...base,
  choices: [],
  usage: {
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
  },
});

export const collect = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
};
