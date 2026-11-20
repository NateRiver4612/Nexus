import type { ChatQuestionType } from '@nexus/types';
import { describe, expect, test } from 'bun:test';

import { formatQuestionAnswers } from './chatAnswer';

const level: ChatQuestionType = {
  id: 'level',
  prompt: 'Level',
  kind: 'single',
  options: [{ label: 'Beginner' }, { label: 'Advanced' }],
};
const time: ChatQuestionType = { id: 'time', prompt: 'Time', kind: 'text' };
const topics: ChatQuestionType = {
  id: 'topics',
  prompt: 'Topics',
  kind: 'multiple',
  options: [{ label: 'A' }, { label: 'B' }],
};

describe('formatQuestionAnswers', () => {
  test('formats the answer exactly as the user message example', () => {
    expect(
      formatQuestionAnswers({
        questions: [level, time],
        answers: { level: 'Beginner', time: '30 min/day' },
      }),
    ).toBe('Level: Beginner · Time: 30 min/day');
  });

  test('omits unanswered questions', () => {
    expect(
      formatQuestionAnswers({
        questions: [level, time],
        answers: { level: 'Beginner' },
      }),
    ).toBe('Level: Beginner');
  });

  test('trims answers', () => {
    expect(
      formatQuestionAnswers({
        questions: [time],
        answers: { time: '  30 min/day  ' },
      }),
    ).toBe('Time: 30 min/day');
  });

  test('returns an empty string when nothing is answered', () => {
    expect(formatQuestionAnswers({ questions: [level, time], answers: {} })).toBe('');
  });

  test('keeps a multi-select answer as the joined text', () => {
    expect(
      formatQuestionAnswers({
        questions: [topics],
        answers: { topics: 'A, B' },
      }),
    ).toBe('Topics: A, B');
  });
});
