import { describe, expect, test } from 'bun:test';

import { AIProviderError } from '../../deepseek/errors';
import { ResearchProviderError, isRetryableResearchError } from '../errors';

const tavily = (kind: ConstructorParameters<typeof ResearchProviderError>[0]['kind']) =>
  new ResearchProviderError({ kind, message: 'test' });

describe('isRetryableResearchError', () => {
  test('retries transient Tavily failures', () => {
    expect(isRetryableResearchError({ error: tavily('unavailable') })).toBe(true);
    expect(isRetryableResearchError({ error: tavily('rate_limited') })).toBe(true);
  });

  test('does not retry Tavily submit timeouts or terminal failures', () => {
    expect(isRetryableResearchError({ error: tavily('timeout') })).toBe(false);
    expect(isRetryableResearchError({ error: tavily('config') })).toBe(false);
    expect(isRetryableResearchError({ error: tavily('quota_exceeded') })).toBe(false);
    expect(isRetryableResearchError({ error: tavily('bad_request') })).toBe(false);
    expect(isRetryableResearchError({ error: tavily('not_found') })).toBe(false);
  });

  test('retries transient brief-builder LLM failures', () => {
    expect(isRetryableResearchError({ error: new AIProviderError('unavailable', 'test') })).toBe(
      true,
    );
    expect(isRetryableResearchError({ error: new AIProviderError('rate_limited', 'test') })).toBe(
      true,
    );
    expect(isRetryableResearchError({ error: new AIProviderError('bad_request', 'test') })).toBe(
      false,
    );
    expect(isRetryableResearchError({ error: new AIProviderError('config', 'test') })).toBe(false);
    expect(isRetryableResearchError({ error: new AIProviderError('unknown', 'test') })).toBe(false);
  });

  test('ignores unrelated errors', () => {
    expect(isRetryableResearchError({ error: new Error('test') })).toBe(false);
    expect(isRetryableResearchError({ error: 'test' })).toBe(false);
  });
});
