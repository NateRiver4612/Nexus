import { describe, expect, test } from 'bun:test';
import z from 'zod';

import { DeepSeekProvider, mapFinish } from '../../../providers/deepseek';
import type { ToolDef } from '../../../types';
import { collect, fakeStreamingClient, finishChunk, textChunk, usageChunk } from './fixtures';

describe('streamChat', () => {
  test('streams text deltas, usage, then finish', async () => {
    const provider = new DeepSeekProvider(() =>
      fakeStreamingClient([textChunk('Hello'), textChunk(' world', 'stop'), usageChunk(12, 4)]),
    );

    const events = await collect(
      provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Say hello.' }],
      }),
    );

    expect(events).toEqual([
      { type: 'text-delta', text: 'Hello' },
      { type: 'text-delta', text: ' world' },
      { type: 'usage', usage: { inputTokens: 12, outputTokens: 4 } },
      { type: 'finish', reason: 'stop' },
    ]);
  });

  test('omits the usage event when the provider sends none', async () => {
    const provider = new DeepSeekProvider(() => fakeStreamingClient([finishChunk('stop')]));

    const events = await collect(
      provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi.' }],
      }),
    );

    expect(events).toEqual([{ type: 'finish', reason: 'stop' }]);
  });

  test('sends the expected request shape', async () => {
    let received: Record<string, unknown> | undefined;
    const getTask: ToolDef = {
      name: 'get_task',
      description: 'Get a task by id.',
      parameters: z.object({ taskId: z.string() }),
    };
    const provider = new DeepSeekProvider(() =>
      fakeStreamingClient([finishChunk('stop')], (params) => {
        received = params;
      }),
    );

    await collect(
      provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Look up T-7.' }],
        tools: [getTask],
        maxTokens: 42,
      }),
    );

    expect(received).toMatchObject({
      model: 'test-model',
      max_completion_tokens: 42,
      stream: true,
      stream_options: { include_usage: true },
      thinking: { type: 'disabled' },
    });

    const tools = received?.tools as
      | Array<{
          type: string;
          function: { name: string; description: string; parameters: unknown };
        }>
      | undefined;

    expect(tools?.[0]?.type).toBe('function');
    expect(tools?.[0]?.function.name).toBe('get_task');
    expect(tools?.[0]?.function.description).toBe('Get a task by id.');
    expect(tools?.[0]?.function.parameters).toMatchObject({ type: 'object' });
  });
});

describe('mapFinish', () => {
  const cases: Array<[string | null, 'stop' | 'tool_calls' | 'length']> = [
    ['tool_calls', 'tool_calls'],
    ['length', 'length'],
    ['stop', 'stop'],
    ['content_filter', 'stop'],
    [null, 'stop'],
  ];

  for (const [reason, expected] of cases) {
    test(`maps ${String(reason)} to ${expected}`, () => {
      expect(mapFinish(reason)).toBe(expected);
    });
  }
});
