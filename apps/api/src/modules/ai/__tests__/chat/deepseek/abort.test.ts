import { expect, test } from 'bun:test';

import { DeepSeekProvider } from '../../../providers/deepseek';
import type { StreamEvent } from '../../../types';
import { fakeStreamingClient, textChunk } from './fixtures';

const waitForAbort = (signal?: AbortSignal) =>
  (async function* () {
    yield textChunk('first');

    await new Promise<void>((_resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('aborted'));
        return;
      }

      signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  })();

test('abort ends the stream quietly after the in-flight delta', async () => {
  const controller = new AbortController();
  const provider = new DeepSeekProvider(() =>
    fakeStreamingClient((signal) => waitForAbort(signal)),
  );
  const events: StreamEvent[] = [];

  for await (const event of provider.streamChat({
    model: 'test-model',
    messages: [{ role: 'user', content: 'Count forever.' }],
    signal: controller.signal,
  })) {
    events.push(event);
    if (event.type === 'text-delta') controller.abort();
  }

  expect(events).toEqual([{ type: 'text-delta', text: 'first' }]);
});
