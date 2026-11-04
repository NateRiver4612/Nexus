import { describe, expect, test } from 'bun:test';
import OpenAI from 'openai';

import { DeepSeekProvider } from '../../../providers/deepseek';
import { AIProviderError } from '../../../providers/deepseek/errors';
import { collect, fakeClient, textChunk } from './fixtures';

const busy = () => new OpenAI.APIError(503, {}, 'Service is too busy', new Headers());
const bad = () => new OpenAI.APIError(400, {}, 'Bad request', new Headers());

const input = {
  model: 'test-model',
  messages: [{ role: 'user' as const, content: 'Hi.' }],
};

const streamOf = (...chunks: ReturnType<typeof textChunk>[]) =>
  (async function* () {
    yield* chunks;
  })();

describe('retries', () => {
  test('retries a transient failure while opening the stream', async () => {
    let calls = 0;
    const provider = new DeepSeekProvider(() =>
      fakeClient(async () => {
        calls += 1;
        // Two upstream 503s, then the third attempt opens the stream.
        if (calls < 3) throw busy();
        return streamOf(textChunk('Hello', 'stop'));
      }),
    );

    const events = await collect(provider.streamChat({ ...input, retries: 2 }));

    expect(calls).toBe(3);
    expect(events).toEqual([
      { type: 'text-delta', text: 'Hello' },
      { type: 'finish', reason: 'stop' },
    ]);
  });

  test('gives up once the retry budget is spent', async () => {
    let calls = 0;
    const provider = new DeepSeekProvider(() =>
      fakeClient(async () => {
        calls += 1;
        throw busy();
      }),
    );

    const error = await collect(provider.streamChat({ ...input, retries: 2 })).catch((err) => err);

    expect(calls).toBe(3);
    expect(error).toBeInstanceOf(AIProviderError);
    expect(error).toMatchObject({ kind: 'unavailable' });
  });

  test('does not retry a non-transient failure', async () => {
    let calls = 0;
    const provider = new DeepSeekProvider(() =>
      fakeClient(async () => {
        calls += 1;
        throw bad();
      }),
    );

    const error = await collect(provider.streamChat({ ...input, retries: 2 })).catch((err) => err);

    expect(calls).toBe(1);
    expect(error).toMatchObject({ kind: 'bad_request' });
  });

  test('does not retry unless the caller opts in', async () => {
    let calls = 0;
    const provider = new DeepSeekProvider(() =>
      fakeClient(async () => {
        calls += 1;
        throw busy();
      }),
    );

    await collect(provider.streamChat(input)).catch(() => undefined);

    expect(calls).toBe(1);
  });

  test('abort stops retrying and ends the stream quietly', async () => {
    const controller = new AbortController();
    let calls = 0;
    const provider = new DeepSeekProvider(() =>
      fakeClient(async () => {
        calls += 1;
        throw busy();
      }),
    );

    controller.abort();
    const events = await collect(
      provider.streamChat({ ...input, retries: 2, signal: controller.signal }),
    );

    expect(calls).toBe(1);
    expect(events).toEqual([]);
  });

  test('does not retry after deltas have streamed', async () => {
    let calls = 0;
    const provider = new DeepSeekProvider(() =>
      fakeClient(async () => {
        calls += 1;
        return (async function* () {
          yield textChunk('first');
          throw busy();
        })();
      }),
    );

    const error = await collect(provider.streamChat({ ...input, retries: 2 })).catch((err) => err);

    expect(calls).toBe(1);
    expect(error).toBeInstanceOf(AIProviderError);
    expect(error).toMatchObject({ kind: 'unavailable' });
  });

  test('generateText retries a transient failure', async () => {
    let calls = 0;
    const provider = new DeepSeekProvider(() =>
      fakeClient(async () => {
        calls += 1;
        if (calls < 2) throw busy();
        return { choices: [{ message: { content: 'ok' } }], usage: null };
      }),
    );

    const result = await provider.generateText({ ...input, retries: 1 });

    expect(calls).toBe(2);
    expect(result.text).toBe('ok');
  });
});
