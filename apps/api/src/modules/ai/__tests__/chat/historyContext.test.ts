import type { MessageType } from '@nexus/types';
import { describe, expect, test } from 'bun:test';

import { formatAssistantHistoryMessage, toModelMessages } from '../../chat/historyContext';

const ATTACHMENT_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

const message = (
  overrides: Partial<MessageType> & Pick<MessageType, 'role' | 'content'>,
): MessageType => ({
  id: 'message-1',
  conversationId: 'conversation-1',
  sourceId: null,
  metadata: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const attachmentMetadata = {
  attachments: [{ id: ATTACHMENT_ID, name: 'notes.txt', mimeType: 'text/plain', size: 11 }],
};

const context = {
  currentMessageId: 'current-message',
  currentTurnText: new Map([[ATTACHMENT_ID, 'hello world']]),
  charCounts: new Map([[ATTACHMENT_ID, 11]]),
};

const single = {
  id: 'level',
  prompt: 'Level',
  kind: 'single' as const,
  options: [{ label: 'Beginner' }, { label: 'Advanced' }],
};

describe('toModelMessages', () => {
  test('drops stored system messages', () => {
    expect(
      toModelMessages({
        message: message({ role: 'system', content: 'old prompt' }),
        ...context,
      }),
    ).toEqual([]);
  });

  test('passes a user message through unchanged when it has no attachments', () => {
    expect(
      toModelMessages({
        message: message({ role: 'user', content: 'Hi' }),
        ...context,
      }),
    ).toEqual([{ role: 'user', content: 'Hi' }]);
  });

  test('inlines the current turn attachments before the user message', () => {
    expect(
      toModelMessages({
        message: message({
          id: 'current-message',
          role: 'user',
          content: 'Read this',
          metadata: attachmentMetadata,
        }),
        ...context,
      }),
    ).toEqual([
      {
        role: 'system',
        content:
          '<attachment name="notes.txt" type="text/plain" chars="11">hello world</attachment>',
      },
      { role: 'user', content: 'Read this' },
    ]);
  });

  test('uses stubs for earlier attachments', () => {
    expect(
      toModelMessages({
        message: message({
          id: 'older-message',
          role: 'user',
          content: 'Read this',
          metadata: attachmentMetadata,
        }),
        ...context,
      }),
    ).toEqual([
      {
        role: 'system',
        content: '[Attached: notes.txt, 11 chars. Use read_attachment to reopen.]',
      },
      { role: 'user', content: 'Read this' },
    ]);
  });

  test('passes an assistant message through when it has no questions', () => {
    expect(
      toModelMessages({
        message: message({ role: 'assistant', content: 'Sure.' }),
        ...context,
      }),
    ).toEqual([{ role: 'assistant', content: 'Sure.' }]);
  });

  test('rebuilds a question-only assistant turn', () => {
    expect(
      toModelMessages({
        message: message({
          role: 'assistant',
          content: '',
          metadata: { questions: [single] },
        }),
        ...context,
      }),
    ).toEqual([
      {
        role: 'assistant',
        content: '[Questions asked to the user]\n- Level (single choice: Beginner, Advanced)',
      },
    ]);
  });
});

describe('formatAssistantHistoryMessage', () => {
  test('leaves content unchanged when metadata has no questions', () => {
    expect(formatAssistantHistoryMessage({ content: 'Hello', metadata: null })).toBe('Hello');
  });

  test('leaves content unchanged when the questions are malformed', () => {
    expect(
      formatAssistantHistoryMessage({
        content: 'Hello',
        metadata: { questions: [{ id: 'missing-fields' }] },
      }),
    ).toBe('Hello');
  });

  test('renders a question-only assistant turn', () => {
    expect(
      formatAssistantHistoryMessage({
        content: '',
        metadata: { questions: [single] },
      }),
    ).toBe('[Questions asked to the user]\n- Level (single choice: Beginner, Advanced)');
  });

  test('keeps the assistant text before the question block', () => {
    expect(
      formatAssistantHistoryMessage({
        content: 'I need two details first.',
        metadata: { questions: [single] },
      }),
    ).toBe(
      'I need two details first.\n\n[Questions asked to the user]\n- Level (single choice: Beginner, Advanced)',
    );
  });

  test('renders multiple choice, Other, and free text', () => {
    expect(
      formatAssistantHistoryMessage({
        content: '',
        metadata: {
          questions: [
            {
              id: 'topics',
              prompt: 'Topics',
              kind: 'multiple',
              options: [{ label: 'A' }, { label: 'B' }],
              allowOther: true,
            },
            { id: 'time', prompt: 'Time', kind: 'text' },
          ],
        },
      }),
    ).toBe(
      [
        '[Questions asked to the user]',
        '- Topics (multiple choice: A, B) + Other',
        '- Time (free text)',
      ].join('\n'),
    );
  });

  test('treats whitespace-only content as empty', () => {
    expect(
      formatAssistantHistoryMessage({ content: '  \n', metadata: { questions: [single] } }),
    ).toBe('[Questions asked to the user]\n- Level (single choice: Beginner, Advanced)');
  });
});
