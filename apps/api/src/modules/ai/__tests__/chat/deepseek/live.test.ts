/**
 * Live wire-compatibility checks against the real DeepSeek API.
 * Skipped unless LIVE_AI=1. These make paid network calls.
 */
import { describe, expect, test } from 'bun:test';
import z from 'zod';

import { DeepSeekProvider } from '../../../providers/deepseek';
import type { ChatMessage, ToolDef } from '../../../types';
import { collect } from './fixtures';

const live = process.env.LIVE_AI === '1' ? describe : describe.skip;

const getLiveProvider = async () => {
  const { getDeepSeekClient, modelForTask } = await import('../../../../../lib/client');
  return {
    provider: new DeepSeekProvider(() => getDeepSeekClient()),
    model: modelForTask('project-chat'),
  };
};

live('DeepSeek live wire compatibility', () => {
  test('streams text deltas, usage, and a stop finish', async () => {
    const { provider, model } = await getLiveProvider();
    const events = await collect(
      provider.streamChat({
        model,
        messages: [{ role: 'user', content: 'Name three colors.' }],
        maxTokens: 100,
      }),
    );

    const text = events.reduce(
      (acc, event) => (event.type === 'text-delta' ? acc + event.text : acc),
      '',
    );
    const usage = events.find((event) => event.type === 'usage');

    expect(text.trim().length).toBeGreaterThan(0);
    expect(usage).toBeDefined();
    if (usage?.type !== 'usage') throw new Error('expected a usage event');
    expect(usage.usage.inputTokens).toBeGreaterThan(0);
    expect(usage.usage.outputTokens).toBeGreaterThan(0);
    expect(events.find((event) => event.type === 'finish')).toEqual({
      type: 'finish',
      reason: 'stop',
    });
    expect(events.some((event) => event.type === 'tool-call')).toBe(false);
  }, 30_000);

  test('returns a valid tool call and completes the round trip', async () => {
    const { provider, model } = await getLiveProvider();
    const getTask: ToolDef = {
      name: 'get_task',
      description: 'Get one task by id, including its status.',
      parameters: z.object({ taskId: z.string() }),
    };
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'What is the status of task T-7? Use the get_task tool.',
      },
    ];

    const first = await collect(
      provider.streamChat({ model, messages, tools: [getTask], maxTokens: 300 }),
    );
    const callEvent = first.find((event) => event.type === 'tool-call');

    expect(callEvent?.type).toBe('tool-call');
    if (callEvent?.type !== 'tool-call') throw new Error('expected a tool call');
    expect(callEvent.call.name).toBe('get_task');

    const parsed = getTask.parameters.safeParse(callEvent.call.args);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected valid tool arguments');
    expect(parsed.data as { taskId: string }).toMatchObject({ taskId: 'T-7' });
    expect(first.find((event) => event.type === 'finish')).toEqual({
      type: 'finish',
      reason: 'tool_calls',
    });

    messages.push({ role: 'assistant', content: '', toolCalls: [callEvent.call] });
    messages.push({
      role: 'tool',
      toolCallId: callEvent.call.id,
      content: JSON.stringify({ id: 'T-7', status: 'blocked' }),
    });

    const second = await collect(
      provider.streamChat({ model, messages, tools: [getTask], maxTokens: 300 }),
    );
    const answer = second.reduce(
      (acc, event) => (event.type === 'text-delta' ? acc + event.text : acc),
      '',
    );

    expect(answer).toMatch(/blocked/i);
    expect(second.find((event) => event.type === 'finish')).toEqual({
      type: 'finish',
      reason: 'stop',
    });
  }, 60_000);
});
