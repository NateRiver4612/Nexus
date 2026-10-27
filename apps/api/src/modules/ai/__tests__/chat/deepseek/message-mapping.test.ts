import { describe, expect, test } from 'bun:test';

import { toOpenAIMessages } from '../../../providers/deepseek';
import type { ChatMessage } from '../../../types';

describe('toOpenAIMessages', () => {
  test('maps system and user messages', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'Be concise.' },
      { role: 'user', content: 'What is blocked?' },
    ];

    expect(toOpenAIMessages(messages)).toEqual([
      { role: 'system', content: 'Be concise.' },
      { role: 'user', content: 'What is blocked?' },
    ]);
  });

  test('maps assistant tool calls and stringifies their arguments', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'call_1', name: 'get_task', args: { taskId: 'T-7' } }],
      },
    ];

    expect(toOpenAIMessages(messages)).toEqual([
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'get_task', arguments: '{"taskId":"T-7"}' },
          },
        ],
      },
    ]);
  });

  test('omits tool_calls for a plain assistant message', () => {
    const messages: ChatMessage[] = [{ role: 'assistant', content: 'T-7 is blocked.' }];

    expect(toOpenAIMessages(messages)).toEqual([{ role: 'assistant', content: 'T-7 is blocked.' }]);
  });

  test('maps tool results to the matching tool call id', () => {
    const messages: ChatMessage[] = [
      { role: 'tool', toolCallId: 'call_1', content: '{"status":"blocked"}' },
    ];

    expect(toOpenAIMessages(messages)).toEqual([
      { role: 'tool', tool_call_id: 'call_1', content: '{"status":"blocked"}' },
    ]);
  });
});
