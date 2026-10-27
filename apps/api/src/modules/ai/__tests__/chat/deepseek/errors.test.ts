import { describe, expect, test } from 'bun:test';
import OpenAI from 'openai';

import {
  AIProviderError,
  toAIProviderError,
  type AIProviderErrorKind,
} from '../../../providers/deepseek/errors';

const apiError = (status: number) =>
  new OpenAI.APIError(status, {}, `status ${status}`, new Headers());

describe('toAIProviderError', () => {
  test('passes an AIProviderError through unchanged', () => {
    const original = new AIProviderError('config', 'nope');

    expect(toAIProviderError(original)).toBe(original);
  });

  test('classifies connection and timeout errors as unavailable', () => {
    const connection = new OpenAI.APIConnectionError({ message: 'offline' });
    const timeout = new OpenAI.APIConnectionTimeoutError({ message: 'slow' });

    expect(toAIProviderError(connection).kind).toBe('unavailable');
    expect(toAIProviderError(timeout).kind).toBe('unavailable');
  });

  const statusCases: Array<[number, AIProviderErrorKind]> = [
    [400, 'bad_request'],
    [401, 'config'],
    [402, 'config'],
    [422, 'bad_request'],
    [429, 'rate_limited'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ];

  for (const [status, expected] of statusCases) {
    test(`classifies HTTP ${status} as ${expected}`, () => {
      const error = toAIProviderError(apiError(status));

      expect(error.kind).toBe(expected);
      expect(error.cause).toBeDefined();
    });
  }

  test('classifies a non-OpenAI Error as unknown', () => {
    expect(toAIProviderError(new Error('boom')).kind).toBe('unknown');
  });

  test('classifies a non-Error value as unknown and keeps its message', () => {
    const error = toAIProviderError('boom');

    expect(error.kind).toBe('unknown');
    expect(error.message).toBe('boom');
    expect(error.cause).toBe('boom');
  });
});
