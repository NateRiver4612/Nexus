import { describe, expect, test } from 'bun:test';
import OpenAI from 'openai';

import { DeepSeekProvider } from '../../../providers/deepseek';
import { AIProviderError } from '../../../providers/deepseek/errors';
import { fakeClient, fakeGenerateClient } from './fixtures';

const input = {
  model: 'test-model',
  messages: [{ role: 'user' as const, content: 'Say hi.' }],
};

describe('generateText', () => {
  test('returns text and usage', async () => {
    const provider = new DeepSeekProvider(() =>
      fakeGenerateClient({
        choices: [{ message: { content: 'hello' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    );

    const result = await provider.generateText(input);

    expect(result).toEqual({
      text: 'hello',
      usage: { inputTokens: 10, outputTokens: 5 },
    });
  });

  test('defaults missing usage to zero tokens', async () => {
    const provider = new DeepSeekProvider(() =>
      fakeGenerateClient({
        choices: [{ message: { content: 'hello' } }],
        usage: null,
      }),
    );

    const result = await provider.generateText(input);

    expect(result).toEqual({
      text: 'hello',
      usage: { inputTokens: 0, outputTokens: 0 },
    });
  });

  test('classifies provider errors', async () => {
    const provider = new DeepSeekProvider(() =>
      fakeClient(async () => {
        throw new OpenAI.APIError(429, {}, 'rate limited', new Headers());
      }),
    );

    const error = await provider.generateText(input).catch((err) => err);

    expect(error).toBeInstanceOf(AIProviderError);
    expect(error).toMatchObject({ kind: 'rate_limited' });
  });
});
