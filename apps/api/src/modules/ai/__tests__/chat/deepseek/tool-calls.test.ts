import { describe, expect, test } from 'bun:test';

import { DeepSeekProvider, parseArgs } from '../../../providers/deepseek';
import { AIProviderError } from '../../../providers/deepseek/errors';
import { collect, fakeStreamingClient, finishChunk, toolCallChunk } from './fixtures';

describe('parseArgs', () => {
  test('treats empty arguments as an empty object', () => {
    expect(parseArgs('')).toEqual({});
    expect(parseArgs('   ')).toEqual({});
  });

  test('parses valid JSON', () => {
    expect(parseArgs('{"taskId":"T-7"}')).toEqual({ taskId: 'T-7' });
  });

  test('repairs malformed JSON', () => {
    expect(parseArgs('{"taskId":"T-7",}')).toEqual({ taskId: 'T-7' });
  });

  test('throws an unknown provider error when arguments cannot be repaired', () => {
    let error: unknown;
    try {
      parseArgs('{{{');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(AIProviderError);
    expect(error).toMatchObject({ kind: 'unknown' });
  });
});

describe('streamChat tool calls', () => {
  test('accumulates split deltas into one event per call, in index order', async () => {
    const provider = new DeepSeekProvider(() =>
      fakeStreamingClient([
        toolCallChunk({ index: 1, id: 'call_b', name: 'beta', args: '{"x":' }),
        toolCallChunk({ index: 0, id: 'call_a', name: 'alpha', args: '{"a":' }),
        toolCallChunk({ index: 1, args: '1}' }),
        toolCallChunk({ index: 0, args: '2}' }),
        finishChunk('tool_calls'),
      ]),
    );

    const events = await collect(
      provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Run both tools.' }],
      }),
    );

    expect(events).toEqual([
      { type: 'tool-call', call: { id: 'call_a', name: 'alpha', args: { a: 2 } } },
      { type: 'tool-call', call: { id: 'call_b', name: 'beta', args: { x: 1 } } },
      { type: 'finish', reason: 'tool_calls' },
    ]);
  });

  test('parses empty streamed arguments as an empty object', async () => {
    const provider = new DeepSeekProvider(() =>
      fakeStreamingClient([
        toolCallChunk({ index: 0, id: 'call_1', name: 'noop' }),
        finishChunk('tool_calls'),
      ]),
    );

    const events = await collect(
      provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Do nothing.' }],
      }),
    );

    expect(events[0]).toEqual({
      type: 'tool-call',
      call: { id: 'call_1', name: 'noop', args: {} },
    });
  });

  test('repairs malformed arguments before emitting the call', async () => {
    const provider = new DeepSeekProvider(() =>
      fakeStreamingClient([
        toolCallChunk({
          index: 0,
          id: 'call_1',
          name: 'get_task',
          args: '{"taskId":"T-7",}',
        }),
        finishChunk('tool_calls'),
      ]),
    );

    const events = await collect(
      provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Look up T-7.' }],
      }),
    );

    expect(events[0]).toEqual({
      type: 'tool-call',
      call: { id: 'call_1', name: 'get_task', args: { taskId: 'T-7' } },
    });
  });

  test('throws when arguments cannot be repaired', async () => {
    const provider = new DeepSeekProvider(() =>
      fakeStreamingClient([
        toolCallChunk({ index: 0, id: 'call_1', name: 'broken', args: '{{{' }),
        finishChunk('tool_calls'),
      ]),
    );

    const error = await collect(
      provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Break.' }],
      }),
    ).catch((err) => err);

    expect(error).toBeInstanceOf(AIProviderError);
    expect(error).toMatchObject({ kind: 'unknown' });
  });

  test('throws when the stream ends with an incomplete tool call', async () => {
    const provider = new DeepSeekProvider(() =>
      fakeStreamingClient([
        toolCallChunk({ index: 0, id: 'call_1', args: '{}' }),
        finishChunk('tool_calls'),
      ]),
    );

    const error = await collect(
      provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Incomplete.' }],
      }),
    ).catch((err) => err);

    expect(error).toBeInstanceOf(AIProviderError);
    expect(error).toMatchObject({ kind: 'unknown' });
  });
});
